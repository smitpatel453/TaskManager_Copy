import { Request, Response } from 'express';
import { ENV } from '../config/env.js';
import axios from 'axios';
import { UserMongooseModel } from '../models/user.model.js';

export const getSlackAuthUrl = (req: Request, res: Response) => {
    // Generate Slack OAuth URL
    const clientId = ENV.SLACK_CLIENT_ID;
    const redirectUri = ENV.SLACK_REDIRECT_URI;
    
    if (!clientId) {
        res.status(500).json({ error: "Slack integration not configured on this server." });
        return;
    }

    // Use user_scope to get a user token that can read all public channels easily
    const userScopes = "channels:history,channels:read,users:read,users:read.email";
    
    // Pass user ID as local state to link account in callback
    const state = req.user?.userId;

    const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&user_scope=${userScopes}&redirect_uri=${redirectUri}&state=${state}`;
    
    res.json({ url: authUrl });
};

export const handleSlackCallback = async (req: Request, res: Response) => {
    try {
        const { code, state } = req.query;
        if (!code || typeof code !== 'string') {
            res.status(400).send("Missing authorization code.");
            return;
        }
        
        const userId = state as string;
        if (!userId) {
            res.status(400).send("Missing state parameter (User ID).");
            return;
        }

        // Exchange code for token
        const tokenResponse = await axios.post('https://slack.com/api/oauth.v2.access', null, {
            params: {
                client_id: ENV.SLACK_CLIENT_ID,
                client_secret: ENV.SLACK_CLIENT_SECRET,
                code,
                redirect_uri: ENV.SLACK_REDIRECT_URI
            }
        });

        const { data } = tokenResponse;

        if (!data.ok) {
            console.error("Slack OAuth Error:", data.error);
            res.status(400).send(`Slack OAuth Error: ${data.error}`);
            return;
        }

        // For user_scope, the token is in data.authed_user.access_token
        const userToken = data.authed_user?.access_token;
        if (!userToken) {
            res.status(400).send("No user access token received.");
            return;
        }

        // Save token to user
        await UserMongooseModel.findByIdAndUpdate(userId, {
            slackIntegration: {
                accessToken: userToken,
                teamId: data.team?.id,
                teamName: data.team?.name,
            }
        });

        // The user will typically complete auth via a popup, so we can return a success HTML
        // that closes the popup.
        res.send(`
            <html>
                <head><title>Slack Connected</title></head>
                <body>
                    <h2>Connection successful!</h2>
                    <p>You can close this window now.</p>
                    <script>
                        setTimeout(() => {
                            window.opener?.postMessage('slack-auth-success', '*');
                            window.close();
                        }, 1000);
                    </script>
                </body>
            </html>
        `);
    } catch (error) {
        console.error("Error handling Slack callback:", error);
        res.status(500).send("Internal server error during Slack authentication.");
    }
};

export const getSlackChannels = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const user = await UserMongooseModel.findById(userId);

        const token = user?.slackIntegration?.accessToken;
        if (!token) {
            res.status(401).json({ error: "Not connected to Slack." });
            return;
        }

        const response = await axios.get('https://slack.com/api/conversations.list', {
            headers: { Authorization: `Bearer ${token}` },
            params: {
                types: 'public_channel',
                exclude_archived: true,
                limit: 100 // We can add cursor pagination later if needed
            }
        });

        if (!response.data.ok) {
            console.error("Slack conversations.list Error:", response.data.error);
            res.status(400).json({ error: response.data.error });
            return;
        }

        res.json({ channels: response.data.channels });
    } catch (error) {
        console.error("Error fetching Slack channels:", error);
        res.status(500).json({ error: "Failed to fetch Slack channels." });
    }
};

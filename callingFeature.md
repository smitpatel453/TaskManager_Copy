Building a video-calling app involves a choice between developing a custom solution from scratch or using third-party APIs/SDKs to accelerate the process. Most modern developers prefer using Communication Platform as a Service (CPaaS) providers to handle the complex backend infrastructure, such as signaling and media servers. 
CometChat
CometChat
 +4
1. Choose Your Development Path
API/SDK Integration (Recommended): Use pre-built tools from providers like Agora, Stream, MirrorFly, or CometChat. This path significantly reduces development time and handles the heavy lifting of real-time communication protocols like WebRTC.
Building from Scratch: Requires deep knowledge of WebRTC, signaling servers (using Node.js or similar), and STUN/TURN servers for NAT traversal. This offers maximum control but is complex and capital-intensive.
No-Code Solutions: Platforms like Appy Pie or Shoutem allow you to drag and drop features to create a basic video-calling app without writing code. 
CometChat
CometChat
 +6
2. Essential Features to Include
To build a functional Minimum Viable Product (MVP), you should prioritize these core features:
One-on-One and Group Calling: The primary function allowing real-time video/audio exchange.
User Authentication: Secure login via email, phone, or social accounts (e.g., using Clerk or Firebase).
Text Chat: In-call messaging for sharing links or quick notes.
Push Notifications: Alerts for incoming calls and new messages.
Call Controls: Standard buttons for mute, camera toggle, and ending the call. 
YouTube
YouTube
 +5
3. Recommended Tech Stack
Category 	Recommended Technology
Mobile Framework	Flutter or React Native (for cross-platform)
Web Framework	Next.js or React
Real-Time Protocol	WebRTC (Standard for browser/app video communication)
Backend	Node.js with Socket.io for signaling
Cloud Hosting	AWS, Google Cloud, or Azure
4. Estimated Costs and Timeline
Prices and timelines vary based on complexity and developer location:
Basic Version: Costs between $6.4K and $20K and takes roughly 1–2 months to develop.
Advanced/Enterprise Version: Can cost $40K to over $150K and take 6+ months, especially when adding features like AI transcription or high-level security compliance (HIPAA/GDPR). 
QuickBlox
QuickBlox
 +2
5. Implementation Steps
Research: Define your target audience (e.g., healthcare, education, or social) to determine specific feature needs like encryption or screen sharing.
Select SDK/API: Sign up for a provider like ZEGOCLOUD or Stream and obtain your API keys.
UI/UX Design: Focus on simplicity; ensure video is the centerpiece and controls are unobtrusive.
Integration: Add the SDK dependencies to your project and implement the logic for creating, joining, and leaving calls.
Testing: Test for audio/video sync, latency, and performance under poor network conditions. 
YouTube
YouTube
 +7
Would you like to focus on a specific platform like Android, iOS, or Web, or should we look into a specific feature like screen sharing?



undefined
undefined
undefined
18 sites
A Complete Guide to Building A Video Chat Application
Plug your existing AI logic into our agent chat infrastructure. * Moderation & Guardrails. * Analytics & Insights. * Notification ...

CometChat

What are the best approaches for video chat integration for an app?
* RowAccomplished9090. • 1y ago. Agora is good. * • 1y ago. Agora is good for video calling, its very easy with it actually. Just ...

Reddit

How to Develop a Video Chat App - QuickBlox
How to Develop a Video Chat App * Introduction. * Define Your Use Case and Target Audience. * Must-Have Features for a Video Chat ...

QuickBlox

Show all
what should be more appropriate , applying cometchat is free ? and can handle thousands of calling and messages and video calling request in a day
6 hours ago

While CometChat offers a generous free tier for development, it is not appropriate for handling thousands of requests per day on the free plan due to strict user and concurrency limits. 
CometChat
CometChat
 +1
Can the Free Plan Handle High Volume?
No. The Build (Free) plan is designed for testing and integration rather than high-volume production use. 
CometChat
CometChat
 +1
User Limit: You are capped at 100 Monthly Active Users (MAU). If you reach this limit, you cannot create new users without deleting existing ones.
Calling Minutes: The free plan provides 10,000 complimentary voice and video minutes per month. Thousands of calls per day would exhaust this monthly allowance almost immediately.
Concurrency: You are limited to 25 peak concurrent connections. In a high-traffic app, this means only 25 users can be connected to your chat/calling services at the exact same time.
Rate Limits: Free accounts are restricted to 500 API requests per minute, significantly lower than the 20,000 allowed for paid tiers. 
CometChat
CometChat
 +6
Scaling for High Volume
If your app expects thousands of daily interactions, you will likely need a paid plan or a different architecture.
Feature 	Build (Free)	Basic ($239/mo)	Advanced ($359/mo)
Max Users (MAU)	100	Starts at 2,000	Starts at 5,000
Calls & Video	10k min/mo	Pay-as-you-go	Pay-as-you-go
Messages	Unlimited	Unlimited	Unlimited
PCC (Concurrency)	25	5% of MAU	5% of MAU
Recommendation
Use CometChat Free if you are in the development phase or building a very small, private tool for under 100 people.
Switch to a Paid Plan if you have a growing user base. CometChat is highly scalable once you move past the free tier, having demonstrated the ability to handle over 1 million concurrent connections on its infrastructure.
Alternative for "Free" High Volume: If you have zero budget and must handle thousands of users, consider self-hosting an open-source solution like Jitsi Meet or building directly on WebRTC with a library like PeerJS, though this requires managing your own signaling and TURN servers. 
CometChat
CometChat
 +2
What is your expected number of concurrent users (people calling at the same time), and are you looking for a no-code or custom-coded solution?



undefined
undefined
undefined
8 sites
Add Real-Time Text, Voice, & Video Chat to your ... - CometChat
Simple, transparent, predictable. Know exactly what you'll pay - and why. ... How many monthly users do you need? ... * Build. A f...

CometChat

Is CometChat free forever?
Is CometChat free forever? 💡 ... YES! Get started with CometChat now by simply signing up at https://app.cometchat.com. Once you'

CometChat

Constraints, Rate Limits And Errors - CometChat Docs
Table_title: ​ Users and Groups: Properties and Constraints Table_content: header: | Item | Property or Constraint | Notes | row: ...

CometChat

Show all
on WebRTC with a library like PeerJS, though this requires managing your own signaling and TURN servers. what that offers
6 hours ago

Using PeerJS with WebRTC essentially offers you a "Direct-to-Consumer" model for video calling. Instead of renting a factory (CPaaS like Agora), you are building your own pipeline. 
For an app handling "thousands of calls a day," this approach offers massive cost savings but introduces specific architectural limits. 
1. The Core "Offer": What You Gain
Near-Zero Operating Costs (The "Free" Aspect)
1:1 Calls: In a Peer-to-Peer (P2P) architecture, audio and video go directly from User A to User B. The data does not touch your server.
Bandwidth: You pay $0 for the video bandwidth in roughly 80–85% of cases.
Contrast: CPaaS providers charge per minute (e.g., $0.004/min). For 1,000 calls/day (avg 10 mins), CPaaS could cost $1,200+/month. PeerJS would cost you roughly $40–$80/month for server hosting.
Total Privacy (HIPAA/GDPR Friendly)
Because the video stream goes P2P, you (the developer) literally cannot record or see the video even if you wanted to. It is encrypted End-to-End by default.
Low Latency
The connection is direct, creating the fastest possible route for data (ideal for gaming or fast-paced interaction). 
2. The "Catch": What You Must Manage
Since you are the "architect," you must build the two pieces that CPaaS usually handles for you:
A. The Signaling Server (The "Matchmaker") 
Role: PeerJS needs a server just to say, "User A wants to call User B, here is their IP address." Once they connect, this server steps out.
Requirement: You must host a Node.js server (using peerjs-server).
Load: Very low. A standard $10/month VPS (like DigitalOcean or Linode) can easily handle the "handshakes" for thousands of daily calls. 
B. STUN/TURN Servers (The "Relay")
Role: About 15–20% of users are behind strict corporate firewalls or symmetric NATs (e.g., strict mobile networks). P2P will fail for them.
Solution: You need a TURN Server (typically open-source CoTURN) to relay the data.
Cost: Unlike the signaling server, this does use bandwidth. You will pay for the data transfer of that 20% of users.
Warning: If you skip setting up a TURN server, your app will work for you during testing but will fail for ~1 in 5 real-world users. 
3. The Critical Limitation: Group Calling
This is the dealbreaker for many.
Mesh Topology: PeerJS uses a "Mesh" network. If 4 people are on a call, every person sends their video 3 separate times (one to each participant).
The Limit: A modern smartphone will overheat and crash if you try to connect more than 4–5 people in a single video call.
Verdict: If your app requires large group meetings (classrooms, webinars), PeerJS will not work. You would need a Media Server (SFU) like Mediasoup or Jitsi, which is significantly harder to build than PeerJS. 
Summary Comparison for High Volume
Feature 	CPaaS (Agora/CometChat)	PeerJS + Custom Server
Cost (10k calls/day)	Very High ($$$$)	Very Low ($ - Server Host Only)
Development Speed	Fast (Weeks)	Slow (Months)
1-on-1 Quality	Excellent	Excellent
Group Calls (5+ users)	Excellent	Fails / Not Viable
Reliability	Guaranteed (SLA)	Your Responsibility
Recommendation:
If your app is primarily for 1-on-1 calls (dating, doctor consultations, support), PeerJS is the superior choice financially. You save thousands of dollars. 
If you need group conferencing, PeerJS is likely a trap. You should look into self-hosting Jitsi Meet or using a paid provider.






9 sites
Building a Custom WebRTC Video Call with PeerJS and ...
Building a Custom WebRTC Video Call with PeerJS and WebSocket Signaling * In this article, I'll walk you through building a video ...

Medium

Why should you use PeerJS Webrtc for a video calling app ...
Here's a detailed cost breakdown: Agora Pricing (as of 2025): Audio Calling: $0.99 per 1,000 minutes per user. Video Calling: Stan...

Primocys

Building PeerJS WebRTC App with JavaScript - VideoSDK
What is PeerJS? ... . WebRTC, or Web Real-Time Communication, is a technology that allows audio, video, and data sharing between b...

videosdk.live

Show all
what about webrtc
6 hours ago

WebRTC (Web Real-Time Communication) is the core "engine" that makes modern video calling possible. While PeerJS is a simplified library (a "wrapper"), WebRTC is the actual industry-standard technology built into every major web browser like Chrome, Safari, and Firefox. 
1. What WebRTC Actually Does
WebRTC allows browsers and mobile apps to talk to each other directly (Peer-to-Peer) without needing a central server to pass the video data through. 
YouTube
YouTube
 +1
It handles three main jobs: 
MediaStream: Accesses your camera and microphone.
RTCPeerConnection: Establishes and maintains the secure direct connection between two devices.
RTCDataChannel: Allows you to send other data, like text chat or files, directly between users. 
Tragofone
Tragofone
 +3
2. Why Use "Pure" WebRTC Over a Library?
If you choose to use WebRTC directly instead of a library like PeerJS or a service like CometChat, you gain:
Zero Licensing Fees: It is completely free and open-source.
Full Customisation: You control everything—from the video quality (bitrate) to the security protocols.
No Vendor Lock-in: You aren't tied to any company's pricing or service updates. 
OnSIP
OnSIP
 +3
3. The "Pure" WebRTC Workflow
To handle thousands of calls a day with pure WebRTC, you must build the "Signaling" yourself:
Signaling (The Handshake): WebRTC doesn't know how to find other users on its own. You must build a Signaling Server (usually using WebSockets) so User A can send a "call request" to User B.
SDP Exchange: The users exchange "Session Descriptions" (SDP) through your server to agree on what video/audio formats to use.
ICE Candidates: They exchange network information (IP addresses) to find the best way to connect.
The Call: Once connected, the video flows directly between them. Your server is no longer involved, which is why it's so cheap to run. 
YouTube
YouTube
 +2
4. Scaling Challenges
1-on-1 Calls: WebRTC is perfect for this. Thousands of daily 1:1 calls will cost you very little in server fees.
Group Calls: As mentioned before, standard P2P WebRTC fails for large groups because each user must upload their video multiple times. To scale group calls (like Zoom), you would eventually need a Media Server (SFU) like Jitsi Videobridge or Mediasoup, which acts as a "middleman" for the video data. 
Cardinal Peak
Cardinal Peak
 +1
Recommendation:
If you want to handle thousands of 1:1 calls for free, learning "Pure" WebRTC is the best long-term investment. You can find comprehensive documentation and guides on the Official WebRTC Site or MDN Web Docs.
Do you want a code snippet showing how to start a basic WebRTC connection, or should we look at how to set up the signaling server first?



undefined
undefined
undefined
15 sites
How Browsers Video Call Without Servers –WebRTC ...
WebRTC stands for web real-time communications and enables live video calls in the browser without third-party support. It support...

YouTube
·
Akhil Sharma

4m
What is WebRTC? (Explanation, use cases, and features) - Ably
What is WebRTC? (Explanation, use cases, and features) ... WebRTC (Web Real-time Communication) is an industry effort to enhance t...

Ably Realtime

Signaling and video calling - WebRTC API - MDN Web Docs
Signaling and video calling * WebRTC allows real-time, peer-to-peer, media exchange between two devices. A connection is establish...

MDN Web Docs

Show all
Group Calls: As mentioned before, standard P2P WebRTC fails for large groups because each user must upload their video multiple times. To scale group calls (like Zoom), you would eventually need a Media Server (SFU) like Jitsi Videobridge or Mediasoup, which acts as a "middleman" for the video data . for handling group calls is their any other way
6 hours ago

If you want to handle group calls without the "Mesh" problem (where everyone sends video to everyone else), there are technically three architectures. Since we’ve established that Mesh (P2P) fails for groups, you are left with two "middleman" options:
1. The SFU (Selective Forwarding Unit) — The Standard
This is what Mediasoup, Jitsi, and LiveKit use.
How it works: Each user uploads their video once to the server. The server then "forwards" that stream to everyone else.
The Benefit: It is very light on the user's phone/battery. It handles the "thousands of requests" efficiently because it doesn't process the video; it just routes packets.
The Catch: You need a server with good CPU and high bandwidth, as the server handles all the incoming and outgoing data.
2. The MCU (Multipoint Control Unit) — The "Heavy" Way
This is the older, "classic" way of doing video conferencing.
How it works: The server receives everyone's video, mixes them together into one single video frame (like a collage), and sends that one stream back to everyone.
The Benefit: The user’s device only ever downloads one stream, no matter if there are 5 or 50 people in the call. Best for very weak devices.
The Catch: It is extremely expensive to run. Your server has to "decode" and "re-encode" video in real-time, which requires massive CPU power.
Is there a "Third Way" for Group Calls?
If you are looking for an alternative that avoids setting up complex media servers like Mediasoup, here are your "hacks":
A. The "Hybrid" Approach (Small Groups)
You can technically optimize P2P (Mesh) to handle up to 6–8 people by:
Lowering Resolution: Forcing all participants to 360p instead of 1080p.
Voice-Activation: Only showing the video of the person speaking and "pausing" the video tracks of others.
Verdict: This is a "budget" fix and will still feel laggy for users on mobile data.
B. Use an Open-Source "Wrapper" (The Easiest Route)
Instead of building an SFU from scratch, use a pre-built backend that you can host yourself for free.
LiveKit: Currently the most popular modern choice. It’s open-source, written in Go, and very easy to deploy compared to Mediasoup.
Jitsi Meet (Self-Hosted): You can install the entire Jitsi stack on a Ubuntu server in about 15 minutes. It handles the SFU logic for you out of the box.
C. Peer-to-Peer "Forwarding" (Experimental)
There is a concept called P2P Relay, where one user with a very strong connection acts as the "server" for the others.
Verdict: This is highly unreliable for a professional app because if the "host" leaves or has a glitch, the whole call drops.
Which one fits your budget?
If you have $0 budget but want to support groups of 10+ people:
Best Bet: Rent a $20/month VPS and install LiveKit or Jitsi. It will handle your "thousands of daily calls" as long as the concurrency (people talking at the same exact time) isn't too high for that single server.
Do you want to see the server requirements (RAM/CPU) needed to host a group-call server for, say, 100 concurrent users?


problem is i dont have server
6 hours ago

If you do not have a private server, you can still build and scale a video-calling app using "Always Free" Cloud Tiers or Developer Platforms. These allow you to host the necessary signaling or media servers at zero cost.
1. Best "Always Free" Servers for Video Calling
These providers give you a virtual private server (VPS) for free indefinitely, which is perfect for hosting a Signaling Server or a small SFU (LiveKit/Jitsi).
Oracle Cloud "Always Free" Tier: This is the most generous offer in the industry. It provides a powerful ARM-based instance with 4 cores and 24 GB of RAM, which is more than enough to handle hundreds of concurrent group callers.
Google Cloud Free Tier: Offers an E2-micro instance (approx. 1GB RAM) for free in specific US regions. While weaker than Oracle, it is sufficient for a lightweight Node.js signaling server.
Microsoft Azure Free Tier: Includes 12 months of popular free services and a set of "Always Free" services, though its VPS options are typically more limited after the first year. 
Oracle
Oracle
 +3
2. Platforms for Fast Deployment (No Server Management)
If you want to avoid "managing" a Linux server, these platforms can host your backend code (Signaling) directly from a GitHub repository.
Render: Their free tier supports WebSockets, which are essential for WebRTC signaling. You can deploy a Node.js signaling server in minutes.
Railway: Provides a trial credit that can host small apps for free. It is very user-friendly for deploying real-time communication backends.
Koyeb: Offers a "Starter" plan with 512MB RAM that stays free as long as your service is active. 
Render
Render
 +3
3. Strategic Free Use of Third-Party APIs
If you don't want to build any infrastructure, you can use the free tiers of professional services, though they have hard limits:
Agora: Gives you 10,000 free minutes every month. This is excellent for a small group of users but will start costing once you hit "thousands of calls a day".
Dyte: Offers a free tier that includes up to 10,000 minutes per month for voice and video calling.
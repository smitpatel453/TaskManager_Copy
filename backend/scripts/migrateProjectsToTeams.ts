import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "mydb";

if (!MONGODB_URI) {
    console.error("MONGODB_URI is not set in .env");
    process.exit(1);
}

const mongoUri = MONGODB_URI;

type LegacyProject = {
    _id: mongoose.Types.ObjectId;
    createdBy?: mongoose.Types.ObjectId;
    assignedUsers?: mongoose.Types.ObjectId[];
};

function fallbackTeamNameForCreator(creatorId: string): string {
    return `Legacy Team ${creatorId.slice(-6)}`;
}

async function main() {
    console.log("Starting migration: projects without teamId -> fallback teams");

    await mongoose.connect(mongoUri, { dbName: DB_NAME });
    const db = mongoose.connection.db;

    if (!db) {
        throw new Error("Database connection failed");
    }

    const projectsCollection = db.collection("projects");
    const teamsCollection = db.collection("teams");

    const legacyProjects = (await projectsCollection
        .find({
            $or: [
                { teamId: { $exists: false } },
                { teamId: null },
            ],
        })
        .project({ _id: 1, createdBy: 1, assignedUsers: 1 })
        .toArray()) as unknown as LegacyProject[];

    if (legacyProjects.length === 0) {
        console.log("No legacy projects found. Nothing to migrate.");
        await mongoose.disconnect();
        return;
    }

    console.log(`Found ${legacyProjects.length} projects without teamId`);

    const groupedByCreator = new Map<string, LegacyProject[]>();
    for (const project of legacyProjects) {
        const creatorId = project.createdBy?.toString();
        if (!creatorId) continue;
        const list = groupedByCreator.get(creatorId) || [];
        list.push(project);
        groupedByCreator.set(creatorId, list);
    }

    let totalUpdatedProjects = 0;
    let createdTeams = 0;

    for (const [creatorId, projects] of groupedByCreator.entries()) {
        const teamName = fallbackTeamNameForCreator(creatorId);

        const existingTeam = await teamsCollection.findOne({
            teamName,
            createdBy: new mongoose.Types.ObjectId(creatorId),
        });

        let teamId: mongoose.Types.ObjectId;

        if (existingTeam?._id) {
            teamId = existingTeam._id as mongoose.Types.ObjectId;
        } else {
            const memberSet = new Set<string>([creatorId]);
            for (const project of projects) {
                for (const memberId of project.assignedUsers || []) {
                    memberSet.add(memberId.toString());
                }
            }

            const now = new Date();
            const inserted = await teamsCollection.insertOne({
                teamName,
                description: "Auto-created by migration for legacy projects",
                isPrivate: true,
                members: Array.from(memberSet).map((id) => new mongoose.Types.ObjectId(id)),
                createdBy: new mongoose.Types.ObjectId(creatorId),
                createdAt: now,
                updatedAt: now,
            });

            teamId = inserted.insertedId;
            createdTeams += 1;
            console.log(`Created fallback team ${teamName} (${teamId.toString()}) for creator ${creatorId}`);
        }

        const projectIds = projects.map((p) => p._id);
        const updateResult = await projectsCollection.updateMany(
            { _id: { $in: projectIds } },
            { $set: { teamId, updatedAt: new Date() } }
        );

        totalUpdatedProjects += updateResult.modifiedCount;
        console.log(`Updated ${updateResult.modifiedCount} projects for creator ${creatorId}`);
    }

    console.log("Migration complete");
    console.log(`Created teams: ${createdTeams}`);
    console.log(`Projects updated: ${totalUpdatedProjects}`);

    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error("Migration failed:", error instanceof Error ? error.message : error);
    await mongoose.disconnect();
    process.exit(1);
});

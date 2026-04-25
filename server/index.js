import bcrypt from 'bcrypt';
import cors from 'cors';
import crypto from 'node:crypto';
import express from 'express';
import fs from 'node:fs/promises';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginName = 'st-gm-bridge';
const port = 8090;
const jwtSecret = crypto.randomBytes(32).toString('hex');
const saltRounds = 10;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientPath = path.join(__dirname, 'client');
const usersPath = path.join(__dirname, 'data', 'users.json');
const sessionConfigPath = path.join(__dirname, 'data', 'session-config.json');

export function startServer() {
    const app = express();

    app.use(cors());
    app.use(express.json());
    app.use(express.static(clientPath));

    async function readUsers() {
        const contents = await fs.readFile(usersPath, 'utf8');
        return JSON.parse(contents || '{}');
    }

    async function writeUsers(users) {
        await fs.writeFile(usersPath, `${JSON.stringify(users, null, 4)}\n`);
    }

    async function readSessionConfig() {
        try {
            const contents = await fs.readFile(sessionConfigPath, 'utf8');
            return JSON.parse(contents);
        } catch {
            return { rpgCompanionEnabled: false };
        }
    }

    async function writeSessionConfig(config) {
        await fs.writeFile(sessionConfigPath, `${JSON.stringify(config, null, 4)}\n`);
    }

    function createToken(username) {
        return jwt.sign({ username }, jwtSecret, { expiresIn: '12h' });
    }

    app.get('/health', (_request, response) => {
        response.json({ ok: true, plugin: pluginName });
    });

    app.get('/session/config', async (_request, response) => {
        const config = await readSessionConfig();
        response.json(config);
    });

    app.post('/session/config', async (request, response) => {
        const { rpgCompanionEnabled } = request.body ?? {};
        if (typeof rpgCompanionEnabled !== 'boolean') {
            return response.status(400).json({ error: 'rpgCompanionEnabled must be a boolean' });
        }
        await writeSessionConfig({ rpgCompanionEnabled });
        response.json({ rpgCompanionEnabled });
    });

    app.post('/auth/register', async (request, response) => {
        const { username, password } = request.body ?? {};

        if (!username || !password) {
            return response.status(400).json({ error: 'Username and password are required.' });
        }

        const users = await readUsers();

        if (users[username]) {
            return response.status(409).json({ error: 'Username already exists.' });
        }

        users[username] = {
            passwordHash: await bcrypt.hash(password, saltRounds),
        };

        await writeUsers(users);

        return response.json({ token: createToken(username), username });
    });

    app.post('/auth/login', async (request, response) => {
        const { username, password } = request.body ?? {};

        if (!username || !password) {
            return response.status(400).json({ error: 'Username and password are required.' });
        }

        const users = await readUsers();
        const user = users[username];

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return response.status(401).json({ error: 'Invalid username or password.' });
        }

        return response.json({ token: createToken(username), username });
    });

    const server = app.listen(port, () => {
        console.log(`[${pluginName}] Server listening on port ${port}`);
    });
    return server;
}

// Direct execution guard for npm start
import { fileURLToPath as _fileURLToPath } from 'url';
if (process.argv[1] === _fileURLToPath(import.meta.url)) {
    startServer();
}

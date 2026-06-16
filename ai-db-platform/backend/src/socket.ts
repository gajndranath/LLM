import { io } from './index';
import axios from 'axios';
import { env } from './config/env';
import { dbQuery } from './config/database';
import { getConnectionPool } from './services/connection.service';
import { extractSchema, formatSchemaForPrompt } from './services/schema.service';

io.on('connection', (socket) => {
  console.log(`🔌 Client connected to Socket.io: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });

  socket.on('probe_requirements', async (data: { 
    sessionId: string,
    userId: string,
    userMessage: string, 
    provider: string,
    model: string
  }) => {
    try {
      // 1. Fetch Session
      const sessionRes = await dbQuery(
        `SELECT id, connection_id FROM design_studio_sessions WHERE id = $1 AND user_id = $2`,
        [data.sessionId, data.userId]
      );
      if (sessionRes.rows.length === 0) {
        socket.emit('probe_error', 'Session not found');
        return;
      }
      const session = sessionRes.rows[0];

      // 2. Fetch Transcript
      const transcriptRes = await dbQuery(
        `SELECT role, content FROM session_messages WHERE session_id = $1 ORDER BY created_at ASC`,
        [data.sessionId]
      );
      const conversationContext = transcriptRes.rows
        .map((msg: { role: string; content: string }) => `${msg.role === 'user' ? 'User' : 'ATLAS'}: ${msg.content}`)
        .join('\n');

      // 3. Fetch Schema Context (if existing DB)
      let schemaContext = "";
      if (session.connection_id) {
        try {
          const pool = await getConnectionPool(session.connection_id, data.userId);
          const schema = await extractSchema(pool, session.connection_id);
          schemaContext = formatSchemaForPrompt(schema);
        } catch (err) {
          console.error("Failed to extract schema for probe context", err);
        }
      }

      // Add a slight delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const response = await axios.post(`${env.AI_SERVICE_URL}/design-studio/probe-requirements-stream`, {
        user_input: data.userMessage,
        conversation_context: conversationContext,
        schema_context: schemaContext,
        provider: data.provider,
        model: data.model
      }, {
        headers: { 'x-internal-secret': env.AI_SERVICE_SECRET },
        responseType: 'stream'
      });

      let accumulatedReply = "";

      response.data.on('data', (chunk: Buffer) => {
        const textChunk = chunk.toString('utf-8');
        accumulatedReply += textChunk;
        socket.emit('probe_chunk', textChunk);
      });

      response.data.on('end', async () => {
        try {
          const isReady = accumulatedReply.includes('READY_TO_GENERATE');
          const cleanReply = accumulatedReply.replace('READY_TO_GENERATE', '').trim();

          await dbQuery('BEGIN');
          await dbQuery(`INSERT INTO session_messages (session_id, role, content) VALUES ($1, 'user', $2)`, [data.sessionId, data.userMessage]);
          await dbQuery(`INSERT INTO session_messages (session_id, role, content) VALUES ($1, 'atlas', $2)`, [data.sessionId, cleanReply]);
          await dbQuery('UPDATE design_studio_sessions SET updated_at = NOW() WHERE id = $1', [data.sessionId]);
          await dbQuery('COMMIT');

          socket.emit('probe_end', { isReadyToGenerate: isReady, fullReply: cleanReply });
        } catch (dbErr) {
          console.error("Failed to save stream to DB", dbErr);
          socket.emit('probe_error', 'Stream finished but failed to save to database.');
        }
      });

      response.data.on('error', (err: any) => {
        console.error('Python Stream Error:', err);
        socket.emit('probe_error', 'Stream encountered an error.');
      });

    } catch (error: any) {
      console.error('Socket Probe Error:', error.message);
      if (error.response?.status === 429) {
        socket.emit('probe_error', 'API Rate Limit Exceeded! Please switch models.');
      } else {
        socket.emit('probe_error', 'Failed to generate requirements. Please try again.');
      }
    }
  });
});

import { aiClient } from './aiClient';
import { ApiError } from '../utils/ApiError';

export const generateSchemaVisuals = async (schemaContext: string) => {
  try {
    const response = await aiClient.post('/generate-schema-visuals', {
      schema_context: schemaContext,
    });
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || error.message;
    throw new ApiError(error.response?.status || 500, `AI Visuals Error: ${message}`);
  }
};

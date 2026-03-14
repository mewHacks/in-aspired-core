// swagger.ts
// Configures Swagger/OpenAPI documentation for the In-Aspired API

import swaggerJsDoc from 'swagger-jsdoc';
import { CONFIG } from './env';

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'In-Aspired API',
            version: '1.0.0',
            description: 'API documentation for In-Aspired Backend',
            contact: {
                name: 'In-Aspired Team',
                email: CONFIG.OFFICIAL_EMAIL
            }
        },
        servers: [
            {
                url: `http://localhost:${CONFIG.PORT}`,
                description: 'Local Development Server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'] // Path to files containing JSDoc
};

export const swaggerSpec = swaggerJsDoc(swaggerOptions);

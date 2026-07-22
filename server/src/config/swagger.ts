import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TaskFlow AI API',
      version: '1.0.0',
      description: 'AI-Powered Real-Time Collaborative Task Management Board - REST API Documentation',
      contact: {
        name: 'TaskFlow AI',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    'src/routes/authRoutes.ts',
    'src/routes/boardRoutes.ts',
    'src/routes/aiRoutes.ts',
    'src/routes/userRoutes.ts',
    'src/routes/messageRoutes.ts',
    'src/routes/searchRoutes.ts',
    'src/routes/focusRoutes.ts',
    'src/routes/automationRoutes.ts',
    'src/routes/moodRoutes.ts',
    'src/routes/timeTrackingRoutes.ts',
    'src/routes/settingsRoutes.ts',
    'src/routes/gamificationRoutes.ts',
    'src/routes/taskDependencyRoutes.ts',
    'src/routes/burndownRoutes.ts',
    'src/routes/recurringTaskRoutes.ts',
    'src/routes/customFieldRoutes.ts',
    'src/routes/auditLogRoutes.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

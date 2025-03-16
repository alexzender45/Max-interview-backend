import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Collaborative Editor API',
    version: '1.0.0',
    description: 'API documentation for real-time collaborative text editor'
  },
  servers: [
    {
      url: 'http://localhost:4000/api',
      description: 'Local server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      Document: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f191e810c19729de860ea'
          },
          content: {
            type: 'string',
            example: 'Document content'
          },
          version: {
            type: 'number',
            example: 1
          },
          createdBy: {
            $ref: '#/components/schemas/User'
          },
          collaborators: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/User'
            }
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011'
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com'
          },
          name: {
            type: 'string',
            example: 'John Doe'
          }
        }
      },
      TextOperation: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['insert', 'delete']
          },
          position: {
            type: 'number',
            example: 10
          },
          text: {
            type: 'string',
            example: 'new text'
          },
          length: {
            type: 'number',
            example: 5
          }
        },
        required: ['type', 'position']
      },
      VersionConflict: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Version conflict'
          },
          transformedOp: {
            $ref: '#/components/schemas/TextOperation'
          },
          currentVersion: {
            type: 'number',
            example: 2
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'Error message'
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  example: 'email'
                },
                message: {
                  type: 'string',
                  example: 'Email is required'
                }
              }
            }
          }
        }
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      ServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      }
    }
  }
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/models/*.ts']
};

export default options;
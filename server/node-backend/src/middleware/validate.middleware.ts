import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

// Validation middleware that takes a Zod schema and returns an Express middleware function
// Prevents invalid or malicious data from reaching controllers
export const validate = (schema: ZodSchema<any>) =>
    async (req: Request, res: Response, next: NextFunction) => {
        try {

            // Validate request data against the provided Zod schema
            await schema.parseAsync({
                body: req.body, // Checks body
                query: req.query, // Checks query params
                params: req.params, // Checks route params
            });

            // If success, proceed to next middleware 
            return next();

        } catch (error) { // Error handling
            return next(error);
        }
    };

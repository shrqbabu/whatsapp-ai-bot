import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AISettingsRepository } from '../database/repositories/aiSettingsRepository.js';
import { SessionRepository } from '../database/repositories/sessionRepository.js';

export const updateAISettingsSchema = z.object({
  enabled: z.boolean().optional(),
  system_prompt: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  api_base_url: z.string().nullable().optional(),
  api_key: z.string().nullable().optional(),
  reply_delay: z.number().min(0).max(60).optional(),
  debounce_delay: z.number().min(0).max(30).optional(),
  groups_enabled: z.boolean().optional(),
  reply_only_when_mentioned: z.boolean().optional(),
  business_hours_enabled: z.boolean().optional(),
});

export class AIController {
  static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const session = await SessionRepository.getOrCreateByUserId(userId);
      const settings = await AISettingsRepository.findBySessionId(session.id);

      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const session = await SessionRepository.getOrCreateByUserId(userId);
      const data = updateAISettingsSchema.parse(req.body);

      const updated = await AISettingsRepository.update(session.id, data);

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

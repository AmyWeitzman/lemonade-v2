/**
 * Pet System Routes
 *
 * POST /api/pets/adopt       — adopt a pet (validate housing limits, charge fee)
 * POST /api/pets/:id/release — release a pet (put up for adoption)
 *
 * Requirements: Req 17
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';
import { validatePlayerAlive } from '../middleware/validatePlayerAlive';
import { getIO } from '../socket';
import { sendNotification } from '../lib/yearCycle';
import { adoptPet, type PetSize } from '../lib/pets';

const router = Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const adoptSchema = z.object({
  gameSessionId: z.string().min(1),
  size: z.enum(['small', 'large']),
});

const releaseSchema = z.object({
  gameSessionId: z.string().min(1),
});

// ─── POST /api/pets/adopt ─────────────────────────────────────────────────────

router.post(
  '/adopt',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = adoptSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, size } = result.data;
    const player = req.player!;

    try {
      // Fetch current housing to get pet limits
      const currentOwnership = await prisma.housingOwnership.findFirst({
        where: { playerId: player.id, endAge: null },
        include: { housing: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!currentOwnership) {
        res.status(400).json({ error: 'You must have housing before adopting a pet' });
        return;
      }

      const housing = currentOwnership.housing;

      // Count current alive pets by size
      const alivePets = await prisma.pet.findMany({
        where: { playerId: player.id, isAlive: true },
        select: { type: true },
      });

      const currentSmallPets = alivePets.filter((p) => p.type === 'small').length;
      const currentLargePets = alivePets.filter((p) => p.type === 'large').length;

      const adoptResult = adoptPet({
        size: size as PetSize,
        playerMoney: player.money,
        currentSmallPets,
        currentLargePets,
        housingLimits: {
          petLimitSmall: housing.petLimitSmall,
          petLimitLarge: housing.petLimitLarge,
        },
      });

      if (!adoptResult.canAdopt) {
        res.status(400).json({ error: adoptResult.reason });
        return;
      }

      // Create pet and deduct fee in a transaction
      const pet = await prisma.$transaction(async (tx) => {
        const newPet = await tx.pet.create({
          data: {
            playerId: player.id,
            type: size,
            age: 0,
            deathAgeMin: adoptResult.deathAgeMin,
            deathAgeMax: adoptResult.deathAgeMax,
            isAlive: true,
          },
        });

        await tx.player.update({
          where: { id: player.id },
          data: { money: adoptResult.newMoney },
        });

        return newPet;
      });

      await sendNotification(
        player.id,
        {
          type: 'success',
          category: 'family',
          title: 'New Pet!',
          message: `You adopted a ${size} pet! Adoption fee: $${adoptResult.adoptionFee.toLocaleString()}.`,
        },
        getIO(),
      );

      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: { money: adoptResult.newMoney },
      });

      res.status(201).json({
        pet,
        adoptionFee: adoptResult.adoptionFee,
        newMoney: adoptResult.newMoney,
      });
    } catch (err) {
      console.error('[pets/adopt]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/pets/:id/release ───────────────────────────────────────────────

router.post(
  '/:id/release',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = releaseSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId } = result.data;
    const { id } = req.params;
    const player = req.player!;

    try {
      const pet = await prisma.pet.findFirst({
        where: { id, playerId: player.id },
      });

      if (!pet) {
        res.status(404).json({ error: 'Pet not found' });
        return;
      }

      if (!pet.isAlive) {
        res.status(400).json({ error: 'Pet is no longer alive' });
        return;
      }

      // Mark pet as released (not alive)
      await prisma.pet.update({
        where: { id },
        data: { isAlive: false },
      });

      await sendNotification(
        player.id,
        {
          type: 'info',
          category: 'family',
          title: 'Pet Released',
          message: `Your ${pet.type} pet has been put up for adoption.`,
        },
        getIO(),
      );

      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: {},
      });

      res.json({ released: true, petId: id });
    } catch (err) {
      console.error('[pets/release]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';

const router = Router();

// ─── GET /api/players/:id/bookmarks ──────────────────────────────────────────
// Returns the player's bookmarked job and education program IDs.
// Requires: Authorization header with valid JWT.
// Response: { jobIds: string[], programIds: string[] }

router.get('/:id/bookmarks', authorize, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const player = await prisma.player.findUnique({
      where: { id },
      select: {
        jobBookmarks: true,
        educationBookmarks: true,
      },
    });

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    res.json({
      jobIds: player.jobBookmarks,
      programIds: player.educationBookmarks,
    });
  } catch (err) {
    console.error('[bookmarks/get]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/players/:id/bookmarks/jobs/:jobId ──────────────────────────────
// Toggles a job bookmark for the player.
// Adds the jobId if absent; removes it if present.
// Requires: Authorization header with valid JWT.
// Response: { bookmarked: boolean, jobIds: string[] }

router.post(
  '/:id/bookmarks/jobs/:jobId',
  authorize,
  async (req: Request, res: Response): Promise<void> => {
    const { id, jobId } = req.params;
    const userId = req.user!.userId;

    try {
      // Verify the job exists
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      // Fetch the player to check ownership and current bookmarks
      const player = await prisma.player.findUnique({
        where: { id },
        select: { userId: true, jobBookmarks: true },
      });

      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      if (player.userId !== userId) {
        res.status(403).json({ error: 'You do not own this player' });
        return;
      }

      const current: string[] = player.jobBookmarks;
      const isBookmarked = current.includes(jobId);
      const updated = isBookmarked
        ? current.filter((bid) => bid !== jobId)
        : [...current, jobId];

      await prisma.player.update({
        where: { id },
        data: { jobBookmarks: updated },
      });

      res.json({ bookmarked: !isBookmarked, jobIds: updated });
    } catch (err) {
      console.error('[bookmarks/jobs/toggle]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/players/:id/bookmarks/education/:programId ────────────────────
// Toggles an education program bookmark for the player.
// Adds the programId if absent; removes it if present.
// Requires: Authorization header with valid JWT.
// Response: { bookmarked: boolean, programIds: string[] }

router.post(
  '/:id/bookmarks/education/:programId',
  authorize,
  async (req: Request, res: Response): Promise<void> => {
    const { id, programId } = req.params;
    const userId = req.user!.userId;

    try {
      // Verify the education program exists
      const program = await prisma.educationProgram.findUnique({ where: { id: programId } });
      if (!program) {
        res.status(404).json({ error: 'Education program not found' });
        return;
      }

      // Fetch the player to check ownership and current bookmarks
      const player = await prisma.player.findUnique({
        where: { id },
        select: { userId: true, educationBookmarks: true },
      });

      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      if (player.userId !== userId) {
        res.status(403).json({ error: 'You do not own this player' });
        return;
      }

      const current: string[] = player.educationBookmarks;
      const isBookmarked = current.includes(programId);
      const updated = isBookmarked
        ? current.filter((bid) => bid !== programId)
        : [...current, programId];

      await prisma.player.update({
        where: { id },
        data: { educationBookmarks: updated },
      });

      res.json({ bookmarked: !isBookmarked, programIds: updated });
    } catch (err) {
      console.error('[bookmarks/education/toggle]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;

import type { BoardPosition } from '@/lib/types';

type BoardMember = {
  id: string;
  email: string;
  board_position: BoardPosition | null;
};

type ReviewingMember = Pick<BoardMember, 'id' | 'board_position'> & {
  role: 'vecino' | 'dirigente';
};

export function selectMembershipReviewer(board: BoardMember[], ownerId: string | null) {
  return board.find((member) => member.board_position === 'secretario')
    ?? board.find((member) => member.id === ownerId)
    ?? board.find((member) => member.board_position === 'presidente')
    ?? board[0]
    ?? null;
}

export function canReviewMembershipApplications(
  member: ReviewingMember,
  hasSecretary: boolean,
  ownerId: string | null,
) {
  if (member.role !== 'dirigente') return false;
  if (member.board_position === 'secretario') return true;

  return !hasSecretary
    && (member.board_position === 'presidente' || member.id === ownerId);
}

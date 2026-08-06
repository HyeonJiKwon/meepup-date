export type ParticipantData = {
  id: string;
  name: string;
  availableDates: string[];
};

export type GameInfo = {
  opponent: string;
  stadium: string;
  isHome: boolean;
};

export type EventWithParticipants = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  candidateDates: string[];
  gameInfo: Record<string, GameInfo> | null;
  deadline: string | null;
  maxParticipants: number | null;
  participants: ParticipantData[];
};

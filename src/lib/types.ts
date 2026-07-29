export type ParticipantData = {
  id: string;
  name: string;
  availableDates: string[];
};

export type EventWithParticipants = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  deadline: string | null;
  participants: ParticipantData[];
};

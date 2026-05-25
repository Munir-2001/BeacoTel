export type ClockStatus = "clocked_in" | "clocked_out";

export type Shift = {
  id: string;
  dateLabel: string; // "OCT 24"
  type: string; // "Evening Shift" | "Morning Shift" | "Day Off"
  timeRange?: string; // "14:00 - 22:30"
  location?: string; // "Concierge Desk"
  note?: string; // "Rest day scheduled"
  isToday?: boolean;
  isOff?: boolean;
};

export const ME = {
  firstName: "Marcus",
  fullName: "Marcus Aurelius Vance",
  email: "m.vance@vdatelkonet.com",
  phone: "+1 (555) 012-3456",
  department: "Concierge",
  personnelId: "#88219",
  clockStatus: "clocked_out" as ClockStatus,
  lastAction: "17:05 Yesterday",
  hoursLogged: 32.5,
  hoursTarget: 40,
};

export const WEEKLY_SCHEDULE: Shift[] = [
  {
    id: "sh-24",
    dateLabel: "OCT 24",
    type: "Evening Shift",
    timeRange: "14:00 - 22:30",
    location: "Concierge Desk",
    isToday: true,
  },
  {
    id: "sh-25",
    dateLabel: "OCT 25",
    type: "Morning Shift",
    timeRange: "06:00 - 14:30",
    location: "Concierge Desk",
  },
  {
    id: "sh-26",
    dateLabel: "OCT 26",
    type: "Day Off",
    note: "Rest day scheduled",
    isOff: true,
  },
  {
    id: "sh-27",
    dateLabel: "OCT 27",
    type: "Morning Shift",
    timeRange: "06:00 - 14:30",
    location: "Front Office Support",
  },
];

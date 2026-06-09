import { cookies } from "next/headers";
import { getPatient } from "@/lib/mock-db";
import WaitingRoomClient from "./WaitingRoomClient";

export const metadata = {
  title: "Waiting Room — MedWait",
  description: "Your personal waiting room with AI companion Ava",
};

export default async function WaitingRoomPage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("sessionId")?.value;

  // Fetch patient data server-side (zero PHI sent to client except minimized context)
  let patientContext = null;

  if (sessionId) {
    const patient = await getPatient(sessionId);
    if (patient) {
      // Only send minimized data to the client
      patientContext = {
        name: patient.name,
        appointmentType: patient.appointmentType,
        estimatedWait: patient.estimatedWait,
        anxietyLevel: patient.anxietyLevel,
        checkInTime: patient.checkInTime,
        // NOTE: dateOfBirth, insuranceProvider, visitReason NOT sent to client
        // visitReason is available server-side only via the orchestrator
      };
    }
  }

  return <WaitingRoomClient patientContext={patientContext} />;
}

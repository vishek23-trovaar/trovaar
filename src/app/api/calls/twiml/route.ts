import { NextRequest, NextResponse } from "next/server";

function buildTwiml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">This call is being recorded for quality and safety purposes on Trovaar. You may disconnect at any time.</Say>
  <Record
    action="/api/calls/recording-webhook"
    recordingStatusCallback="/api/calls/recording-webhook"
    transcribe="true"
    transcribeCallback="/api/calls/transcription-webhook"
    maxLength="3600"
    playBeep="true"
  />
</Response>`;
}

export async function GET(_request: NextRequest) {
  return new NextResponse(buildTwiml(), {
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(_request: NextRequest) {
  return new NextResponse(buildTwiml(), {
    headers: { "Content-Type": "text/xml" },
  });
}

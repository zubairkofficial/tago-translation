import { useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import wave from "../assets/wave.png";
import mic from "../assets/mic.png";
import transcription from "../assets/caption.png";
import leave from "../assets/leave.png";
import { RoomContext } from "@/context/context";
import Helpers from "@/config/helpers";
import { useNavigate } from "react-router-dom";
import { useLiveKit } from '@/hooks/useLiveKit';
import { LocalAudioTrack, RemoteParticipant, RoomEvent } from 'livekit-client';

const API_BASE_URL = "http://localhost:3000/api/v1";

interface TranscriptionMessage {
    type: "transcription";
    text: string;
    language: string;
    timestamp: number;
    isLocal: boolean;
    participantName: string;
    participantId: string;
    sender: string;
    translatedText?: string | null;
}

// ... (keep your existing WAVEncoder class and other utility functions)

const JoinPage = () => {
    // ... (keep your existing state declarations)

    // Updated LiveKit integration with proper message handling
    const { room: livekitRoom, isConnected: isLivekitConnected } = useLiveKit(
        livekitRoomName || '',
        livekitUserName || '',
        livekitWsUrl || '',
        livekitToken || ''
    );

    // Handle incoming data messages (similar to old implementation)
    useEffect(() => {
        if (!livekitRoom) return;

        const handleDataReceived = (payload: Uint8Array, participant?: RemoteParticipant) => {
            try {
                const decodedData = new TextDecoder().decode(payload);
                let data: TranscriptionMessage;

                // Try to parse as JSON, but handle plain text as well
                try {
                    data = JSON.parse(decodedData);
                } catch (jsonError) {
                    // If it's not valid JSON, treat it as plain text
                    console.log("Received plain text instead of JSON:", decodedData);
                    data = {
                        type: "transcription",
                        text: decodedData,
                        sender: participant?.identity || "unknown",
                        timestamp: Date.now(),
                        language: userLanguage,
                        isLocal: participant?.identity === livekitRoom.localParticipant.identity,
                        participantName: participant?.name || participant?.identity || "Unknown",
                        participantId: participant?.identity || "unknown",
                        translatedText: null
                    };
                }

                if (data.type === "transcription" && data.text && data.text.trim() !== '') {
                    console.log("Received transcription from data channel:", data);

                    // Add participant info if missing
                    const enrichedData: TranscriptionMessage = {
                        ...data,
                        participantName: data.participantName || participant?.name || participant?.identity || "Unknown",
                        participantId: data.participantId || participant?.identity || "unknown",
                        isLocal: data.isLocal || participant?.identity === livekitRoom.localParticipant.identity,
                        language: data.language || userLanguage,
                        translatedText: null
                    };

                    setMessages((prev) => [...prev.slice(-19), enrichedData]);
                    setCaption(data.text);
                }
            } catch (error) {
                console.error("Error parsing data message:", error);
            }
        };

        livekitRoom.on(RoomEvent.DataReceived, handleDataReceived);

        return () => {
            livekitRoom.off(RoomEvent.DataReceived, handleDataReceived);
        };
    }, [livekitRoom, userLanguage]);

    // Handle direct API response for local participant (similar to old implementation)
    const handleTranscriptionFromAPI = async (text: string, language: string) => {
        if (!livekitRoom?.localParticipant || !text || text.trim() === '') return;

        console.log("Handling transcription from API:", text, "Language:", language);
        const transcriptionData: TranscriptionMessage = {
            type: "transcription",
            text: text,
            sender: livekitRoom.localParticipant.identity,
            participantName: livekitRoom.localParticipant.name || livekitRoom.localParticipant.identity,
            participantId: livekitRoom.localParticipant.identity,
            isLocal: true,
            timestamp: Date.now(),
            language: language || userLanguage,
            translatedText: null
        };

        // Publish to the room
        try {
            const jsonData = JSON.stringify(transcriptionData);
            console.log("Publishing transcription data to room:", jsonData);

            await livekitRoom.localParticipant.publishData(
                new TextEncoder().encode(jsonData),
                {
                    topic: "transcription",
                    reliable: true,
                }
            );
            console.log("Published transcription data to room");
        } catch (error) {
            console.error("Error publishing data:", error);
        }

        // Also update local state
        setMessages((prev) => [...prev.slice(-19), transcriptionData]);
        setCaption(text);
    };

    // Event handler for transcription events
    useEffect(() => {
        const transcriptionEventHandler = (e: CustomEvent) => {
            console.log("Received transcription event:", e.detail);
            if (e.detail.text && e.detail.text.trim() !== '') {
                handleTranscriptionFromAPI(e.detail.text, e.detail.language);
            }
        };

        window.addEventListener("transcription", transcriptionEventHandler as EventListener);
        return () => {
            window.removeEventListener("transcription", transcriptionEventHandler as EventListener);
        };
    }, [livekitRoom, userLanguage]);

    // Translation effect (separate from message receiving)
    useEffect(() => {
        if (messages.length === 0) return;

        const lastMessage = messages[messages.length - 1];
        if (!lastMessage || lastMessage.translatedText !== null) return;

        const translateMessage = async () => {
            try {
                const myLanguage = Helpers.getLanguageCode(localStorage.getItem("listenerLanguage") || userLanguage || "en");
                const lastMsgLang = Helpers.getLanguageCode(lastMessage.language);
                if (lastMsgLang === myLanguage) {
                    // No need to translate
                    setMessages(prev => prev.map(msg =>
                        msg.timestamp === lastMessage.timestamp
                            ? { ...msg, translatedText: msg.text }
                            : msg
                    ));
                    return;
                }

                const response = await fetch(`${API_BASE_URL}/translate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: lastMessage.text,
                        targetLang: myLanguage,
                        sourceLang: lastMsgLang || 'auto'
                    })
                });

                const data = await response.json();
                const translatedText = data.translatedText || lastMessage.text;

                setMessages(prev => prev.map(msg =>
                    msg.timestamp === lastMessage.timestamp
                        ? { ...msg, translatedText }
                        : msg
                ));

                if (lastMessage.isLocal) return;

                if (role === 'listener') {
                    await playTTS(translatedText, myLanguage);
                }
            } catch (error) {
                console.error('Translation error:', error);
                setMessages(prev => prev.map(msg =>
                    msg.timestamp === lastMessage.timestamp
                        ? { ...msg, translatedText: msg.text }
                        : msg
                ));
            }
        };

        translateMessage();
    }, [messages, role, userLanguage]);

    // ... (keep your existing utility functions like playTTS, processAudioChunk, etc.)

    // Updated publishTranscription function
    const publishTranscription = async (text: string, language: string) => {
        if (!livekitRoom || livekitRoom.state !== 'connected') {
            console.warn('[LIVEKIT] Cannot publish - room not connected');
            return;
        }

        const langCode = Helpers.getLanguageCode(language);
        const message: TranscriptionMessage = {
            type: "transcription",
            text,
            language: langCode,
            timestamp: Date.now(),
            isLocal: true,
            participantName: livekitRoom.localParticipant.name || "You",
            participantId: livekitRoom.localParticipant.identity,
            sender: livekitRoom.localParticipant.identity
        };

        try {
            console.log('[LIVEKIT] Publishing transcription:', message);
            await livekitRoom.localParticipant.publishData(
                new TextEncoder().encode(JSON.stringify(message)),
                {
                    topic: "transcription",
                    reliable: true
                }
            );
            console.log('[LIVEKIT] Transcription published successfully');

            // Update local state
            setMessages((prev) => [...prev.slice(-19), message]);
            setCaption(text);
        } catch (error) {
            console.error('[LIVEKIT] Failed to publish transcription:', error);
        }
    };

    // ... (keep the rest of your component code)
};

export default JoinPage;
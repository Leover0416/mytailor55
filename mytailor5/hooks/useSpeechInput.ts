import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

type SpeechRecognitionInstance = typeof window extends {
  webkitSpeechRecognition: infer T;
}
  ? T
  : any;

interface UseSpeechInputOptions {
  lang?: string;
  onResult: (text: string) => void;
}

export const useSpeechInput = ({ lang = 'zh-CN', onResult }: UseSpeechInputOptions) => {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    const SpeechRecognitionConstructor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript) {
        onResult(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('语音识别错误:', event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    setSupported(true);

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [lang, onResult]);

  const startListening = () => {
    if (!recognitionRef.current || listening) return;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (error) {
      console.error('启动语音识别失败:', error);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setListening(false);
  };

  return {
    supported,
    listening,
    startListening,
    stopListening,
  };
};


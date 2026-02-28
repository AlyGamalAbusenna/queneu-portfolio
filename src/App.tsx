/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, ChevronRight, RotateCcw, Play } from 'lucide-react';

// Configuration for the 8 pages
const PAGES = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  imageSrc: `/assets/pages/page${i + 1}.jpeg`,
  audioSrc: `/assets/audio/page${i + 1}.wav`,
}));

export default function App() {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(true);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const muteTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentPage = PAGES[currentPageIndex];

  // Handle audio playback
  const handleAudioError = useCallback(() => {
    console.warn(`Audio asset missing or unsupported: ${currentPage.audioSrc}. Skipping to next button.`);
    setIsAudioPlaying(false);
    setShowNextButton(true);
  }, [currentPage.audioSrc]);

  const handleAudioEnded = useCallback(() => {
    setIsAudioPlaying(false);
    setShowNextButton(true);
  }, []);

  const playAudio = useCallback(() => {
    if (!audioRef.current || !hasStarted) return;

    // Reset state for new page
    setShowNextButton(false);
    setIsAudioPlaying(true);

    if (isMuted) {
      // If muted, simulate audio duration with a timer
      const handleMetadata = () => {
        const duration = (audioRef.current?.duration || 3) * 1000;
        if (muteTimerRef.current) clearTimeout(muteTimerRef.current);
        muteTimerRef.current = setTimeout(() => {
          handleAudioEnded();
        }, duration);
      };

      if (audioRef.current.readyState >= 1) {
        handleMetadata();
      } else {
        audioRef.current.addEventListener('loadedmetadata', handleMetadata, { once: true });
      }
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.warn("Playback failed:", err);
        // If playback fails (e.g. missing file), trigger the button after a short delay
        setTimeout(handleAudioEnded, 2000);
      });
    }
  }, [hasStarted, isMuted, handleAudioEnded]);

  // Preload next assets
  useEffect(() => {
    const nextIndex = (currentPageIndex + 1) % PAGES.length;
    const nextImg = new Image();
    nextImg.src = PAGES[nextIndex].imageSrc;
    
    const nextAudio = new Audio();
    nextAudio.src = PAGES[nextIndex].audioSrc;
    nextAudio.preload = 'auto';
    nextAudio.onerror = () => {}; // Ignore preload errors
  }, [currentPageIndex]);

  // Effect to trigger audio on page change
  useEffect(() => {
    if (hasStarted) {
      playAudio();
    }
    return () => {
      if (muteTimerRef.current) clearTimeout(muteTimerRef.current);
    };
  }, [currentPageIndex, hasStarted, playAudio]);

  const handleStart = () => {
    setHasStarted(true);
  };

  const handleNext = () => {
    if (isTransitioning || isAudioPlaying) return;
    
    setIsTransitioning(true);
    const nextIndex = (currentPageIndex + 1) % PAGES.length;
    
    // Smooth transition delay
    setTimeout(() => {
      setCurrentPageIndex(nextIndex);
      setIsTransitioning(false);
    }, 500);
  };

  const toggleMute = () => {
    const newMuteStatus = !isMuted;
    setIsMuted(newMuteStatus);
    
    if (audioRef.current) {
      audioRef.current.muted = newMuteStatus;
      
      if (newMuteStatus) {
        // Switching to muted: stop audio and start timer
        audioRef.current.pause();
        const remaining = (audioRef.current.duration - audioRef.current.currentTime) * 1000;
        if (isAudioPlaying) {
          if (muteTimerRef.current) clearTimeout(muteTimerRef.current);
          muteTimerRef.current = setTimeout(handleAudioEnded, Math.max(0, isNaN(remaining) ? 3000 : remaining));
        }
      } else {
        // Switching to unmuted: stop timer and resume audio
        if (muteTimerRef.current) clearTimeout(muteTimerRef.current);
        if (isAudioPlaying) {
          audioRef.current.play().catch(() => {
            // If resume fails, just wait for the end
          });
        }
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-neutral-950 text-white overflow-hidden font-sans select-none"
      onClick={() => {
        // On first click anywhere, try to play audio if it's not already playing
        if (audioRef.current && audioRef.current.paused && isAudioPlaying && !isMuted) {
          audioRef.current.play().catch(() => {});
        }
      }}
    >
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef}
        src={currentPage.audioSrc}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
        muted={isMuted}
        className="hidden"
      />

      {/* Top Bar: Progress & Mute */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-40 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center space-x-3">
          <span className="text-amber-500 font-mono text-lg font-bold">
            {currentPageIndex + 1}
          </span>
          <span className="text-neutral-500 font-mono text-sm">/</span>
          <span className="text-neutral-500 font-mono text-sm">
            {PAGES.length}
          </span>
        </div>

        <button 
          onClick={toggleMute}
          className="p-2 hover:bg-white/10 rounded-full transition-colors group"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="w-6 h-6 text-neutral-400 group-hover:text-white" />
          ) : (
            <Volume2 className="w-6 h-6 text-amber-500 group-hover:text-amber-400" />
          )}
        </button>
      </div>

      {/* Main Content: Image with Transitions */}
      <div className="absolute inset-0 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full h-full flex items-center justify-center"
          >
            <img 
              src={currentPage.imageSrc}
              alt={`Portfolio Page ${currentPage.id}`}
              className="max-w-full max-h-full object-contain z-10 shadow-2xl"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback for missing assets in demo
                (e.target as HTMLImageElement).src = `https://picsum.photos/seed/portfolio${currentPage.id}/1920/1080`;
              }}
            />
            {/* Blurred background fallback for a premium feel */}
            <img 
              src={currentPage.imageSrc}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-20 scale-110"
              aria-hidden="true"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Bar: Action Button */}
      <div className="absolute bottom-0 left-0 right-0 p-12 flex justify-center z-40 bg-gradient-to-t from-black/80 to-transparent">
        <AnimatePresence>
          {showNextButton && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNext}
              className="group flex items-center space-x-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 px-8 py-4 rounded-full font-bold tracking-wider uppercase transition-all shadow-2xl shadow-amber-500/20"
            >
              <span>
                {currentPageIndex === PAGES.length - 1 ? "Return to Beginning" : "Next Page"}
              </span>
              {currentPageIndex === PAGES.length - 1 ? (
                <RotateCcw className="w-5 h-5 group-hover:rotate-[-45deg] transition-transform" />
              ) : (
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Audio Playing Indicator (Subtle) */}
      {isAudioPlaying && (
        <div className="absolute bottom-8 left-8 flex items-end space-x-1 h-4 z-40">
          {[0.6, 0.8, 0.4, 0.9, 0.5].map((h, i) => (
            <motion.div
              key={i}
              animate={{ height: ["20%", "100%", "20%"] }}
              transition={{ 
                duration: 0.8, 
                repeat: Infinity, 
                delay: i * 0.1,
                ease: "easeInOut"
              }}
              className="w-1 bg-amber-500/60 rounded-full"
              style={{ height: `${h * 100}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

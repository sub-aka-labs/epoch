"use client";

import {
  motion,
  useMotionTemplate,
  useScroll,
  useTransform,
} from "framer-motion";
import ReactLenis from "lenis/react";
import { useRef } from "react";
import Link from "next/link";
import { Button } from "./ui/button";

export function SplashScreen() {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
  });

  const yMotionValue = useTransform(scrollYProgress, [0, 1], [300, 0]);
  const transform = useMotionTemplate`rotateX(30deg) translateY(${yMotionValue}px) translateZ(10px)`;

  return (
    <ReactLenis root>
      {/* Section 1: Tagline */}
      <div className="flex min-h-screen w-screen flex-col items-center justify-center px-6 bg-black">
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className=" text-stone-300 w-90 text-center text-lg font-semibold tracking-tight md:w-auto md:text-5xl"
        >
          a new way to bet on real-world <br /> with privacy and security
        </motion.p>
      </div>

      {/* Section 2: 3D Keyword Scroll */}
      <div
        ref={targetRef}
        className="relative z-0 h-[300vh] w-screen tracking-tight"
      >
        <div
          className="sticky top-0 mx-auto flex h-screen items-center justify-center bg-transparent"
          style={{
            transformStyle: "preserve-3d",
            perspective: "200px",
          }}
        >
          <motion.div
            style={{
              transformStyle: "preserve-3d",
              transform,
            }}
            className="font-geist w-full max-w-4xl px-4 text-center text-xs font-bold tracking-tighter text-stone-600 sm:text-sm md:text-base lg:text-lg"
          >
            Privacy. Solana. Arcium. Prediction Markets. MPC. Crypto. Encrypted.
            Verifiable. Sealed. MEV-Resistant. On-Chain. Trustless.
            Zero-Knowledge. Confidential. Decentralized. Permissionless.
            Multi-Party Computation. Private Bets. Real-World Events. Outcomes.
            Conviction. No Exposure. No Front-Running. No Surveillance. Epoch.
            Privacy. Solana. Arcium. Prediction Markets. MPC. Crypto.
            Confidential. Decentralized. Permissionless. Multi-Party
            Computation. Private Bets. Real-World Events. Outcomes. Conviction.
            No Exposure. No Front-Running. No Surveillance. Epoch. Privacy.
            Solana. Arcium. Prediction Markets. MPC. Crypto. Encrypted.
            Verifiable. Sealed. MEV-Resistant. On-Chain. Trustless.
            Zero-Knowledge. Confidential.
          </motion.div>
        </div>
      </div>

      {/* Section 3: EPOCH + Enter */}
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-black px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.5 }}
          className="flex flex-col items-center gap-3"
        >
          <h1 className="text-stone-300 text-3xl font-bold tracking-tighter sm:text-7xl md:text-8xl lg:text-9xl">
            EPOCH.
          </h1>

          <Link href="/markets">
            <Button variant="outline" className="min-w-35 border-0 bg-emerald-600 text-black">
              Get Encrypted
            </Button>
          </Link>
        </motion.div>
      </div>
    </ReactLenis>
  );
}

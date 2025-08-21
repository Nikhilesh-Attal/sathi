
'use client';

import { motion } from "framer-motion";
import Image from "next/image";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
// import Lottie from "lottie-react";
// import pinData from "@/lotties/map-pin.json"; // Cannot add Lottie JSON files, using placeholder image instead.

export function HeroSection() {
  return (
    <section className="w-full flex flex-col md:flex-row items-center justify-center min-h-[calc(100vh-4rem)] px-4 md:px-6 lg:px-8 bg-gradient-to-br from-card to-background">
      <motion.div
        className="flex-1 text-center md:text-left"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-primary">
          Your AI Travel Ally
        </h1>
        <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl md:mx-0 mt-4">
          Plan smarter with AI—discover hidden gems near you in real-time.
        </p>
        <motion.div
          className="mt-6"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button size="lg" asChild>
            <Link href="/login">Get Started for Free</Link>
          </Button>
        </motion.div>
      </motion.div>

      <motion.div
        className="flex-1 mt-10 md:mt-0 flex justify-center items-center max-w-md lg:max-w-lg"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        {/* Lottie animation would go here. Using a placeholder image as I cannot create new JSON asset files. */}
        <Image
          src="https://placehold.co/600x600"
          alt="Traveler with a map animation"
          width={500}
          height={500}
          className="rounded-lg"
          data-ai-hint="traveler map animation"
        />
        {/* <Lottie animationData={pinData} loop /> */}
      </motion.div>
    </section>
  );
}

import { gsap } from "gsap"
import debug from "@cher-ami/debug"
const log = debug(`front:defaultTransitions`)

const xValue = 100
const duration = 1

export const defaultPlayIn = (
  $root?: HTMLElement,
  comeFrom?: string,
  resolve?: () => void
): void => {
   log("dir comeFrom:", comeFrom)
  gsap.fromTo(
    $root,
    {
      autoAlpha: 0,
      x: xValue,
    },
    {
      x: 0,
      autoAlpha: 1,
      duration,
      ease: "power2.inOut",
      onComplete: resolve,
    }
  )
}

export const defaultPlayOut = (
  $root?: HTMLElement,
  goTo?: string,
  resolve?: () => void
): void => {
   log("dir goTo: ", goTo)
  gsap.to(
    $root,
    {
      autoAlpha: 0,
      x: -xValue,
      duration,
      ease: "power2.inOut",
      onComplete: resolve,
    }
  )
}

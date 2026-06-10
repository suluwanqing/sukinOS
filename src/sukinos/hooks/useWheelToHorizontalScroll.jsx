import { useEffect, useRef, useState } from "react";

export const useWheelToHorizontalScroll = (ref, options = {}) => {
  const {
    enabled = true,
    speed = 1,
    minSpeed = 0.2,
    maxSpeed = 6,
    acceleration = 0.05,
    smoothing = 1,
    invert = false,
    preventDefault = false,
    ratio = 1,
    limitSpeed = false,
  } = options;

  const [element, setElement] = useState(null);

  useEffect(() => {
    if (ref && ref.current !== element) {
      setElement(ref.current);
    }
  });

  const configRef = useRef({});
  useEffect(() => {
    configRef.current = {
      speed,
      minSpeed,
      maxSpeed,
      acceleration,
      smoothing,
      invert,
      ratio,
      limitSpeed
    };
  }, [
    speed,
    minSpeed,
    maxSpeed,
    acceleration,
    smoothing,
    invert,
    ratio,
    limitSpeed
  ]);

  const velocityRef = useRef(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const el = element;
    if (!el || !enabled) return;

    const clamp = (val, min, max) =>
      Math.max(min, Math.min(max, val));

    const currentMinSpeed = configRef.current.minSpeed ?? minSpeed;
    const threshold = Math.max(currentMinSpeed, 0.01);

    function animate() {
      if (!el) return;

      velocityRef.current *= 0.92;

      if (Math.abs(velocityRef.current) < threshold) {
        velocityRef.current = 0;
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
        return;
      }

      const currentSmoothing = configRef.current.smoothing ?? smoothing;
      el.scrollLeft += velocityRef.current * currentSmoothing;

      frameRef.current = requestAnimationFrame(animate);
    }

    function handler(e) {
      const config = configRef.current;
      const currentInvert = config.invert ?? invert;
      const currentSpeed = config.speed ?? speed;
      const currentRatio = config.ratio ?? ratio;
      const currentLimitSpeed = config.limitSpeed ?? limitSpeed;
      const currentMaxSpeed = config.maxSpeed ?? maxSpeed;
      const currentAcceleration = config.acceleration ?? acceleration;

      let delta = e.deltaY;

      if (currentInvert) delta *= -1;

      const isTrackpad = e.deltaMode === 0;

      let base = delta * 0.1 * currentSpeed * currentRatio;

      if (isTrackpad) {
        base *= 0.6;
      }

      velocityRef.current += base;

      if (currentLimitSpeed) {
        velocityRef.current = clamp(
          velocityRef.current,
          -currentMaxSpeed,
          currentMaxSpeed
        );
      }

      velocityRef.current += Math.sign(base) * currentAcceleration;

      if (!frameRef.current) {
        frameRef.current = requestAnimationFrame(animate);
      }

      if (preventDefault) {
        e.preventDefault();
      }
    }

    el.addEventListener("wheel", handler, {
      passive: !preventDefault,
    });

    return () => {
      el.removeEventListener("wheel", handler);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [element, enabled, preventDefault]);
};

export default useWheelToHorizontalScroll;

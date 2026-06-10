/**
 * Subtle parallax for images while scrolling: the element is slightly
 * scaled up and shifted against the scroll direction. Skips entirely
 * when the user prefers reduced motion.
 */
export function parallax(node: HTMLElement, strength = 14) {
	if (typeof window === 'undefined') return;
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	let frame = 0;
	node.style.willChange = 'transform';

	const update = () => {
		frame = 0;
		const rect = node.getBoundingClientRect();
		if (rect.bottom < -100 || rect.top > window.innerHeight + 100) return;
		const progress = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
		const y = Math.max(-1, Math.min(1, progress)) * strength;
		node.style.transform = `scale(1.12) translate3d(0, ${y}px, 0)`;
	};

	const schedule = () => {
		if (!frame) frame = requestAnimationFrame(update);
	};

	update();
	window.addEventListener('scroll', schedule, { passive: true });
	window.addEventListener('resize', schedule, { passive: true });

	return {
		destroy() {
			if (frame) cancelAnimationFrame(frame);
			window.removeEventListener('scroll', schedule);
			window.removeEventListener('resize', schedule);
		}
	};
}

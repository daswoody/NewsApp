/**
 * Subtle parallax for images while scrolling: the element is slightly
 * scaled up and shifted against the scroll direction. The base strength
 * comes from the --parallax design token (admin slider, 0 disables the
 * effect); `factor` lets large hero images move a bit more than cards.
 * Skips entirely when the user prefers reduced motion.
 */
export function parallax(node: HTMLElement, factor = 1) {
	if (typeof window === 'undefined') return;
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	const tokenPx = parseFloat(getComputedStyle(node).getPropertyValue('--parallax'));
	const strength = (Number.isFinite(tokenPx) ? tokenPx : 14) * factor;
	if (strength <= 0) return;

	let frame = 0;
	node.style.willChange = 'transform';

	const update = () => {
		frame = 0;
		const rect = node.getBoundingClientRect();
		if (rect.bottom < -100 || rect.top > window.innerHeight + 100) return;
		const progress = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
		// negative factor: the image drifts against the scroll direction
		const y = Math.max(-1, Math.min(1, progress)) * -strength;
		// scale just enough that the shifted image never shows gaps
		const scale = 1 + (2 * strength) / Math.max(rect.height, 1) + 0.01;
		node.style.transform = `scale(${scale.toFixed(3)}) translate3d(0, ${y.toFixed(1)}px, 0)`;
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

// Inline SVG wordmark for "The Luxe Version".
// Rendered inline (not as <img src>) so the fill inherits from CSS
// `color`, letting dark surfaces show cream and light surfaces show black
// without maintaining two logo files.

export default function Wordmark({ height = 32, className = '', style = {}, title = 'The Luxe Version' }) {
  return (
    <svg
      className={className}
      style={{ display: 'block', height, width: 'auto', color: 'inherit', ...style }}
      viewBox="0 0 420 60"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="210"
        y="42"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="'Noto Serif Display', 'Didot', 'Playfair Display', 'Cormorant Garamond', 'Georgia', serif"
        fontSize="36"
        fontWeight="800"
        letterSpacing="4.5"
      >
        THE LUXE VERSION
      </text>
    </svg>
  )
}

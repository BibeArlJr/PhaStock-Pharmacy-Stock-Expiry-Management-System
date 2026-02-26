export default function FullScreenLoader({ label = 'Loading' }) {
  return (
    <>
      <link rel="stylesheet" href="/css/Loading.css" />
      <div className="loading-overlay">
        <div className="loading-wrap">
          <object
            data="/svg/Loading.svg"
            type="image/svg+xml"
            aria-label="Loading animation"
            className="loading-svg"
          >
            <img src="/svg/Loading.svg" alt="Loading" className="loading-svg" />
          </object>
          <p className="loading-label">{label}</p>
        </div>
      </div>
    </>
  );
}

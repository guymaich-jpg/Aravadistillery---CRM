// GuideScreen — embeds the standalone Hebrew user guide (public/guide.html)
// inside the app shell so users learn without leaving the CRM.
// The guide is a self-contained static page; base-path aware via BASE_URL.

export function GuideScreen() {
  const src = `${import.meta.env.BASE_URL}guide.html`;

  return (
    <div className="h-[calc(100vh-8rem)] sm:h-[calc(100vh-7rem)]">
      <iframe
        src={src}
        title="מדריך למשתמש"
        className="w-full h-full border-0 bg-[#f4efe4]"
        loading="lazy"
      />
    </div>
  );
}

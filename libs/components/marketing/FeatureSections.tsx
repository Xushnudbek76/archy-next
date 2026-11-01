import Image from 'next/image';

const steps = [
  {
    title: 'Start with the materials you already have.',
    text: 'Upload a lecture PDF, an audio recording, or both. Keep the explanation and its original source together.',
    image: '/images/upload-preview.webp',
    alt: 'Adding lecture materials to Archy',
    width: 828,
    height: 620,
  },
  {
    title: 'Find your starting point in clear summary notes.',
    text: 'Review the key ideas, check your understanding with a quiz, and ask your AI tutor about concepts that are still unclear.',
    image: '/images/study-preview.jpg',
    alt: 'Archy material and study notes preview',
    width: 1920,
    height: 1200,
  },
];
export function FeatureSections() {
  return (
    <>
      <section className="landing-section" id="features">
        <p className="landing-eyebrow">Why it matters</p>
        <h2>You do not have to chase the lecture.</h2>
        <p>
          Capture the explanation in class. Come back to the important ideas
          when it is time to review.
        </p>
        <div className="landing-grid">
          {[
            [
              'Start recording the moment class begins',
              'Keep the lecture in order, without trying to write down every word.',
            ],
            [
              'Keep the original explanation close',
              'Listen again, follow the transcript, and open the material behind a note.',
            ],
            [
              'A clearer place to begin before an exam',
              'Review the summary, test yourself with questions, and revisit what you missed.',
            ],
          ].map(([title, text], index) => (
            <article className="landing-feature" key={title}>
              <span className="landing-number">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      {steps.map((step, index) => (
        <div
          className={`landing-band ${index % 2 ? 'soft' : ''}`}
          key={step.title}
        >
          <section
            className={`landing-section landing-split ${index % 2 ? 'reverse' : ''}`}
          >
            <div>
              <p className="landing-eyebrow">
                0{index + 1} · From class to review
              </p>
              <h2>{step.title}</h2>
              <p>{step.text}</p>
            </div>
            <Image
              src={step.image}
              alt={step.alt}
              width={step.width}
              height={step.height}
              sizes="(max-width: 700px) 95vw, 55vw"
            />
          </section>
        </div>
      ))}
      <section className="landing-section landing-study-flow">
        <div>
          <p className="landing-eyebrow">A space for your learning</p>
          <h2>
            Record during class.
            <br />
            Return with a fresh perspective.
          </h2>
          <p>
            Your audio, transcript, notes, quizzes, and tutor conversation stay
            with the material you are studying.
          </p>
        </div>
        <div className="landing-phone-previews">
          <Image
            src="/images/record-ready.png"
            alt="Original Archy lecture recording screen"
            width={1170}
            height={2532}
            sizes="(max-width: 700px) 42vw, 220px"
          />
          <Image
            src="/images/lecture-notes.png"
            alt="Original Archy saved lecture notes screen"
            width={1170}
            height={2532}
            sizes="(max-width: 700px) 42vw, 220px"
          />
        </div>
      </section>
    </>
  );
}

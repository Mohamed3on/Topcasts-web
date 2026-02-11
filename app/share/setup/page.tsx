export default function ShareSetupPage() {
  const baseUrl = 'https://topcasts.app/share';

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-4 text-2xl font-bold">Quick Add via iOS Shortcuts</h1>
      <p className="mb-8 text-muted-foreground">
        Save podcast episodes to Topcasts in 2 taps from any podcast app using
        iOS Shortcuts.
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Setup</h2>
        <ol className="list-inside list-decimal space-y-3 text-sm">
          <li>
            Open the <strong>Shortcuts</strong> app on your iPhone
          </li>
          <li>
            Tap <strong>+</strong> to create a new shortcut
          </li>
          <li>
            Name it <strong>&quot;Like on Topcasts&quot;</strong>
          </li>
          <li>
            Add the <strong>&quot;Open URL&quot;</strong> action
          </li>
          <li>
            Set the URL to:{' '}
            <code className="break-all rounded bg-muted px-1.5 py-0.5 text-xs">
              {baseUrl}?url=&#123;Shortcut Input&#125;&amp;rating=like
            </code>
          </li>
          <li>
            Tap the <strong>ⓘ</strong> button and enable{' '}
            <strong>&quot;Show in Share Sheet&quot;</strong>
          </li>
          <li>
            Under <strong>&quot;Share Sheet Types&quot;</strong>, select{' '}
            <strong>URLs</strong>
          </li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">
          Optional: Dislike Shortcut
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Repeat the steps above with:
        </p>
        <ul className="list-inside list-disc space-y-2 text-sm">
          <li>
            Name: <strong>&quot;Dislike on Topcasts&quot;</strong>
          </li>
          <li>
            URL:{' '}
            <code className="break-all rounded bg-muted px-1.5 py-0.5 text-xs">
              {baseUrl}?url=&#123;Shortcut Input&#125;&amp;rating=dislike
            </code>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Alternative: Choose on Page
        </h2>
        <p className="text-sm text-muted-foreground">
          Create a single shortcut with the URL{' '}
          <code className="break-all rounded bg-muted px-1.5 py-0.5 text-xs">
            {baseUrl}?url=&#123;Shortcut Input&#125;
          </code>{' '}
          (omit <code>rating</code>). You&apos;ll pick Like/Dislike on the page
          before saving.
        </p>
      </section>
    </main>
  );
}

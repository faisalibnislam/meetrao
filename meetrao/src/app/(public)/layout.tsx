/* The screens a guest sees with no account.

   The footer is NOT here. It carries a "Powered by Meetrao" badge that Pro
   removes, and whether to show it depends on whose page this is, which a
   layout cannot know. Each page renders <PublicFooter> itself; the legal links
   inside it never depend on the plan.

   THE COLUMN IS LOAD-BEARING. This wrapper used to centre a single child in a
   ROW, fine when a page returned one element, and broken the moment they
   returned two. The card and the footer became siblings in that row: the card
   stopped being centred and the footer climbed to the top-right corner, live
   on the site. A column stacks them and centres each one. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="box-border flex min-h-screen flex-col items-center justify-start p-[20px]">
      {children}
    </div>
  );
}

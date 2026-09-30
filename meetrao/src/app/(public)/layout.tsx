/* The screens a guest sees with no account.

   The footer is NOT here. It carries a "Powered by Meetrao" badge that Pro
   removes, and whether to show it depends on whose page this is — which a
   layout cannot know. Each page renders <PublicFooter> itself; the legal links
   inside it never depend on the plan. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="box-border flex flex-1 items-start justify-center p-[20px]">{children}</div>
    </div>
  );
}

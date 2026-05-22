type Props = {
  projectRef: string;
};

export function LoginHelp({ projectRef }: Props) {
  const usersUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/auth/users`
    : "https://supabase.com/dashboard";

  return (
    <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-100/90">
      <p className="font-semibold text-amber-200">
        Mot de passe correct mais connexion refusee ?
      </p>
      <p className="mt-2">
        Cause n°1 : l&apos;utilisateur est dans <strong>un autre projet</strong> Supabase. Verifiez
        que vous etes sur le projet <strong>{projectRef || "kcwvqwvcyiiwalyvhvxz"}</strong> dans le
        dashboard.
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-4">
        <li>
          <a href={usersUrl} target="_blank" rel="noopener noreferrer" className="underline">
            Ouvrir Users de CE projet
          </a>
        </li>
        <li>
          Ou onglet <strong>Creer un compte</strong> ci-dessus (meme projet que l&apos;app)
        </li>
        <li>
          Cle <code className="text-frmt-green">eyJ...</code> : Supabase → Settings → API →{" "}
          <strong>anon public</strong> (legacy) → remplacer dans .env.local → relancer DEMARRER.bat
        </li>
        <li>
          Authentication → Providers → Email : desactiver temporairement « Confirm email »
        </li>
      </ol>
      <p className="mt-2 font-medium text-amber-200">Fix rapide mot de passe</p>
      <p className="mt-1">
        1. Cle <code className="text-frmt-green">eyJ...</code> dans .env.local (Settings → API → anon)
        <br />
        2. Ou : <code>npm run fix:password -- email@frmt.ma NouveauPass123</code>
        <br />
        (ajouter SUPABASE_SERVICE_ROLE_KEY dans .env.local — voir FIX-MOT-DE-PASSE.txt)
      </p>
    </div>
  );
}

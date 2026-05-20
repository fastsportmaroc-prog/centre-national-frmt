# Scraper FRMT WB27

## Commandes

```bash
npm run import:frmt-classement          # import normal
npm run import:frmt-classement:debug    # + fichiers debug
npm run debug:frmt                      # capture 2014 garçons uniquement
```

## Debug (`data/frmt/debug/`)

| Fichier | Contenu |
|---------|---------|
| `2014-M-tr1-table.html` | HTML du tableau WinDev |
| `2014-M-tr1-inputs.json` | Valeurs input contenant `[année]` |
| `2014-M-tr1-rows.json` | Lignes parsées |
| `2014-M-tr1-innerText.txt` | Texte visible page |
| `2014-M-tr1.png` | Capture écran |
| `ajax-last.txt` | Dernière réponse POST WinDev |

## Si 0 joueur

Le site WinDev remplit des `<input value="NOM [2014] (CLUB)">` — pas toujours le `innerText`.
Le script attend ces champs après **Actualiser**.

Vérifiez dans `*-inputs.json` que des lignes `[2014]` existent après Actualiser.

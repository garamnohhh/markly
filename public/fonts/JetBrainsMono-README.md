# JetBrains Mono (Nerd Fonts patched), subset

`JetBrainsMonoNerdFont-Regular.subset.woff2` — the mono face the whole app is
typeset in, and the source of the tree's marks.

| | |
|---|---|
| Source | `JetBrainsMonoNerdFont-Regular.ttf`, Nerd Fonts 3.5.0, JetBrains Mono 2.304 |
| Built with | `pyftsubset --flavor=woff2` |
| Size | 2474 KB TTF → 65 KB woff2 |
| Kept | Latin-1, Latin Extended-A/B, Greek, Cyrillic, Vietnamese, punctuation, currency, arrows, math, technical, box drawing, block elements, geometric shapes, dingbats, and sixteen Nerd Fonts icons held as locate-mark candidates |
| Dropped | The rest of the Nerd Fonts icon set — roughly 11,000 glyphs the app does not draw |
| Weights | Regular only, as supplied. The `@font-face` claims 400–500, so the one place asking for mono at 500 renders Regular rather than a synthetic weight |

## Licence

JetBrains Mono is under the SIL Open Font License 1.1 — `JetBrainsMono-OFL.txt`,
copied verbatim. It permits redistribution, including of a subset, provided the
licence travels with the font and the reserved font name is not used for a
modified version. This file is named for the source it was cut from and is not
presented as JetBrains Mono itself.

The Nerd Fonts patcher that added the icon glyphs is MIT licensed
(github.com/ryanoasis/nerd-fonts); the icons it draws in carry the licences of
their own upstream sets.

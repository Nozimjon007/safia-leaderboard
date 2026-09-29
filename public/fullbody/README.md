# Full-body demo photos

The 12 JPEGs in this folder are placeholder full-length photos for the demo
dataset's 12 fictional employees (`madina.jpg`, `otabek.jpg`, etc. — filename
matches the member id in `src/data/demoData.ts`). **These are stock photos of
unrelated fitness/athletic models — not real Safia employees, and not the
same person as the matching face in `public/portraits/`.** They exist only
to preview the full-body podium-card and profile-hero layouts with a real
photo instead of the illustrated silhouette placeholder.

## Why a different person than the avatar photo

The small circular avatar (`avatarPhoto`) and this full-length photo
(`fullBodyPhoto`) are deliberately unrelated images for the demo. No tool
available in this project can generate a full-body photo of a specific
existing synthetic face while preserving its identity, and substituting a
different real person's body under an existing face would misrepresent that
person — so rather than do either, the two photo slots are treated as two
separate, independently-sourced demo assets. A real production data source
should of course set both from the *same* real employee's own photos.

## Source and license

All 12 photos are from [Pexels](https://www.pexels.com), used under the
[Pexels License](https://www.pexels.com/license/): free for commercial use,
no attribution required (credited below anyway as good practice), may be
modified (each was resized, nothing else). The Pexels license explicitly
prohibits implying the person shown endorses a product or is affiliated with
one — consistent with why every page here carries a "Demo data" banner and
these are never labeled with a real Safia claim. Downloaded 2026-09-29,
revised 2026-09-29 (swapped for more dynamic athletic action poses).

| Member | Pexels photo |
|---|---|
| madina | https://www.pexels.com/photo/17476809/ |
| otabek | https://www.pexels.com/photo/6250986/ |
| zarina | https://www.pexels.com/photo/17656445/ |
| jahongir | https://www.pexels.com/photo/33037087/ |
| kamronbek | https://www.pexels.com/photo/20615432/ |
| aziz | https://www.pexels.com/photo/9499151/ |
| nodira | https://www.pexels.com/photo/30246174/ |
| gulbahor | https://www.pexels.com/photo/6311322/ |
| shahnoza | https://www.pexels.com/photo/31381383/ |
| dilnoza | https://www.pexels.com/photo/7240207/ |
| sardor | https://www.pexels.com/photo/2216610/ |
| feruza | https://www.pexels.com/photo/4498516/ |

## Selection

Chosen for a standing or dynamic athletic-action full-length pose with the
whole figure — head to shoes — in frame, a plain or reasonably uniform
background (nothing to cut out), and a professional, dignified look
appropriate for a workplace roster. Poses with a genuinely cluttered
background, a seated/kneeling pose, a crop that cut off the head or feet, a
faceless silhouette, or more than one person in frame were excluded, since
this project has no background-removal or image-generation tool to fix any
of that after the fact.

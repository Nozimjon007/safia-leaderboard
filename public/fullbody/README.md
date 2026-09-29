# Full-length demo photos

The 12 JPEGs in this folder are placeholder full-length/waist-up photos for
the demo dataset's 12 fictional employees (`madina.jpg`, `otabek.jpg`, etc.
— filename matches the member id in `src/data/demoData.ts`). **These are
stock photos of unrelated bakery/kitchen models — not real Safia
employees.** They exist to preview the podium-card and profile-hero
layouts with a real, workplace-appropriate photo instead of the
illustrated silhouette placeholder.

## Same person as the avatar

Unlike the previous revision of this asset set, the small circular avatar
(`public/portraits/<id>.jpg`) is now cropped **from this exact same file**
— see `public/portraits/README.md`. One photo per person, two crops, so
the two images can never show a different person or a face stitched onto
an unrelated body.

## Source and license

All 12 photos are from [Pexels](https://www.pexels.com), used under the
[Pexels License](https://www.pexels.com/license/): free for commercial use,
no attribution required (credited below anyway as good practice), may be
modified (each was cropped/resized, nothing else). The license explicitly
prohibits implying the person shown endorses a product or is affiliated
with one — consistent with why every page here carries a "Demo data"
banner and none of these are labeled with a real Safia claim. Downloaded
and revised 2026-09-29 (replaced the prior athletic/sports-themed set with
bakery/kitchen-appropriate portraits).

| Member | Pexels photo |
|---|---|
| madina | https://www.pexels.com/photo/6205769/ |
| otabek | https://www.pexels.com/photo/6050308/ |
| zarina | https://www.pexels.com/photo/7966421/ |
| jahongir | https://www.pexels.com/photo/7447286/ |
| kamronbek | https://www.pexels.com/photo/8629122/ |
| aziz | https://www.pexels.com/photo/8475183/ |
| nodira | https://www.pexels.com/photo/5491147/ |
| gulbahor | https://www.pexels.com/photo/6957845/ |
| shahnoza | https://www.pexels.com/photo/6684767/ |
| dilnoza | https://www.pexels.com/photo/4349921/ |
| sardor | https://www.pexels.com/photo/4252146/ |
| feruza | https://www.pexels.com/photo/10432622/ |

## Selection

Chosen for a natural, friendly expression, tidy work-appropriate clothing
(aprons, chef whites/uniforms), decent even lighting, and a bakery/kitchen/
food-service setting or a plain studio background — the visual tone the
user asked for after the prior athletic-photo set read as off-brand for a
bakery ("looks like an ad for another company" / too sports-editorial).
Rejected candidates included: photos with a real, readable business logo
on the clothing or in the background (e.g. a shirt printed "Friends Pizza
& Kebab," an apron printed "Paris Baguette Boulangerie," another printed
with a real Lviv bakery's name — all real brands, none of them Safia),
stylized fashion-editorial lighting/styling that doesn't read as a
workplace photo, a face turned away or not visible, and group shots.

Five of the twelve source photos are landscape-oriented (chest-up
compositions); for those, `public/fullbody/<id>.jpg` is a taller crop of
the same frame (full height, centered narrower width) rather than the
literal full landscape rectangle, so the card's tall portrait zone doesn't
render mostly empty space. This is a crop, not a stretch or a generated
extension — every pixel is original to the source photo.

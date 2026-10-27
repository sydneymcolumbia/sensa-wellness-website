# Sensa vial shade synthetic dataset v1: what it is and what to watch

Reviewed 19 October 2026. Source archive: `~/Downloads/sensa_vial_synth_v1.zip` (110 MB,
not in this repo). Everything below was checked against the files, not just the README.

## Contents, verified

- 1,320 JPEGs, 600 x 800 portrait, in `images/level_00` to `images/level_10`, 120 per level.
- Labels are carried three ways and agree on every row: the folder, the filename suffix
  (`vial_00913_L07.jpg`) and the `level` column in `manifest.csv`. No file is missing.
- `manifest.csv` has one row per image with: `level` (0 to 10), `concentration` (0 to 1),
  `dye_ref_hex` and r/g/b, `split`, the vial and liquid bounding boxes, the measured liquid
  colour after augmentation, a bare-countertop reference patch colour, and every
  augmentation parameter (illuminant, white balance, exposure, blur, noise, JPEG quality,
  occluders, crop, rotation, perspective).
- Every vial box lies inside the frame; every liquid box lies inside its vial box.
- Also included: `generate_dataset.py` (numpy, opencv, pillow), `base_vial.png` (the one
  source photo), `reference_swatches.png` (the eleven levels under neutral light with the
  dye reference colour of each), `contact_sheet.jpg`.
- Labels are exact: every image is a render at a known dye concentration. There is no
  measurement noise of the kind a lab-labelled set would carry.

## Three things the description does not say

1. **`level` and `concentration` disagree on 28 rows (2 percent).** Concentration is
   level / 10 plus jitter, and the jitter crosses band edges: a level 2 image can carry
   0.253 while a level 3 image carries 0.227. Choose one target per model. A regressor
   trained on concentration and rounded to a band will contradict the folder label on
   those rows.
2. **`dye_ref_hex` is per image, not per level.** 1,237 distinct values, because hue is
   jittered per render. The eleven per-level reference colours are only in
   `reference_swatches.png` (level 0 `#ffffff` through level 10 `#0723bf`).
3. **The split is random per image, not stratified.** Test images per level run from 6
   (level 4) to 19 (level 10), so per-level test accuracy is noisy. Re-split stratified
   from the CSV before reporting per-level numbers.

## The limits that matter more than the labels (from the README, and I agree)

- One background and one pose: the same countertop and Sensa box in every image, vial
  upright, seen from slightly above. A model can learn the background as easily as the
  liquid. Real user photos on varied surfaces are required before anything ships.
- The dye colour is a placeholder. `DYE_ABSORBANCE` and `K_MAX` in the generator set the
  hue and darkness curve. Fit them to photographs of real reacted vials at known analyte
  levels on a neutral grey card, then regenerate.
- The README's own separability test on this set: raw liquid colour gives 29 percent
  exact level, 69 percent within one; normalised against the in-frame countertop patch
  gives 52 percent exact, 84 percent within one. Levels 0 to 4 separate; levels 8 to 10
  overlap under most lighting.
- Its recommendations, which hold: print a neutral grey and white patch on the kit card
  and require it in frame; collect 300 to 500 real photos across surfaces, phones and
  lighting; use this set for pre-training and augmentation only; decide the number of
  output bands with the clinical team, where four or five are defensible from a phone
  photo and eleven are not.

## Regenerate or scale

    python3 generate_dataset.py --out sensa_vial_synth_v2 --per-level 300 --seed 11

## Possible next steps, none started

- Baseline classifier and regressor with per-level results on a stratified split.
- Extend the generator with varied backgrounds and vial poses.
- Wire the generator's dye curve to real reacted-vial photos once they exist.

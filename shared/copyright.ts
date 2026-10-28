/**
 * The copyright notice shown at the bottom centre of every game's main menu and of the home page.
 */

/** Name of the copyright holder, shown after the year. */
const COPYRIGHT_HOLDER = 'Zero Studio Inc';

/**
 * Builds the copyright notice, for example "© 2026 Zero Studio Inc".
 *
 * @param year - Year to show; defaults to the current year, so the notice never needs updating by hand.
 * @returns The notice text.
 */
export const copyrightLabel = (year: number = new Date().getFullYear()): string => `© ${year} ${COPYRIGHT_HOLDER}`;

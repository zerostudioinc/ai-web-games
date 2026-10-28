/**
 * Game versions: reads the `Version:` line of a game's requirements file (games/<name>.md) and turns it into the
 * label shown in the main menu and on the root page's game cards, so the requirements file is the only place to bump it.
 */

/**
 * Reads a game's version from its requirements file.
 *
 * @param markdown - Contents of `games/<name>.md`; the version is the first line that reads `Version: 1.1`.
 * @returns The version without a leading "v" (for example "1.1"), or null when the file declares none.
 */
export function parseVersion(markdown: string): string | null {
  // `m` lets ^ and $ match at every line, so only a line that starts with "Version:" counts, with Unix or Windows line endings.
  // A "v" is dropped only when a digit follows it, so a label never reads "vv1.1" while a word such as "Very" is kept.
  const match = /^[ \t]*Version:[ \t]*(?:v(?=\d))?(\S.*?)[ \t]*$/im.exec(markdown);
  return match ? match[1] : null;
}

/**
 * Formats a version for display.
 *
 * @param version - Version text such as "1.1", or undefined when the game has none.
 * @returns The label, for example "v1.1", or an empty string when there is no version.
 */
export const formatVersion = (version: string | undefined): string => (version ? `v${version}` : '');

/**
 * Fills the `%GAME_VERSION:<game>%` placeholders of an HTML page, so a page can show a game's version without repeating it.
 *
 * @param html - The page's HTML.
 * @param versions - Version of each game by folder name (for example "balloon-catapult").
 * @returns The HTML with every placeholder replaced by that game's version label, or by nothing when the game has no version.
 */
export function fillVersionPlaceholders(html: string, versions: Readonly<Record<string, string | undefined>>): string {
  return html.replace(/%GAME_VERSION:([a-z0-9-]+)%/g, (_placeholder, game: string) =>
    // hasOwn keeps a name such as "constructor" from picking up a built-in property of the object.
    Object.hasOwn(versions, game) ? formatVersion(versions[game]) : '',
  );
}

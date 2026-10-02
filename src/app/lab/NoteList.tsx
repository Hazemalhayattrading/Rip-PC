import type { Note } from '../../data/schema';
import { DotPath } from './DotPath';

/** A record's notes, word for word, each with the field it explains. */
export function NoteList({ notes }: { readonly notes: readonly Note[] }) {
  return (
    <ul role="list" className="space-y-1">
      {notes.map((note, index) => (
        <li key={`${String(index)} ${note.field ?? ''}`}>
          {note.field === undefined ? null : (
            <>
              <DotPath path={note.field} />:{' '}
            </>
          )}
          {note.text}
        </li>
      ))}
    </ul>
  );
}

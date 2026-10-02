/**
 * The Engine lab: everything below a lab page's heading. `App.tsx` loads this module with
 * `React.lazy`, so the lab, the engine helpers and the catalogue loader stay out of the product
 * pages' initial JS (plan §1).
 */
import type { LabPage } from '../routes';
import { LabAccuracy } from './LabAccuracy';
import { LabBanner } from './LabBanner';
import { LabHome } from './LabHome';
import { LabNav } from './LabNav';
import { LabParts } from './LabParts';
import { WithCatalogue } from './WithCatalogue';

export default function EngineLab({ page }: { readonly page: LabPage }) {
  return (
    <>
      <LabBanner />
      <LabNav current={page} />
      <LabPageView page={page} />
    </>
  );
}

function LabPageView({ page }: { readonly page: LabPage }) {
  switch (page) {
    case 'index':
      return <LabHome />;
    case 'parts':
      return <WithCatalogue>{(catalogue) => <LabParts catalogue={catalogue} />}</WithCatalogue>;
    case 'accuracy':
      return <WithCatalogue>{(catalogue) => <LabAccuracy catalogue={catalogue} />}</WithCatalogue>;
  }
}

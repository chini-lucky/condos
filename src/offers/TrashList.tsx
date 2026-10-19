import { PermanentDeleteAction } from "../deletions/PermanentDeleteAction";
import { DeletionCleanupStatus } from "../deletions/DeletionCleanupStatus";
import type { DeletionsRepository } from "../deletions/repository";
import { OfferTrashActions } from "./OfferTrashActions";
import { OfferStatusDisplay } from "./OfferStatusDisplay";
import type { Offer, OffersRepository } from "./repository";
export function TrashList({
  offers,
  repository,
  onRestored,
  deletionRepository,
  onDeleted,
}: {
  offers: readonly Offer[];
  repository: OffersRepository;
  onRestored: (offer: Offer) => void;
  deletionRepository: DeletionsRepository;
  onDeleted: (id: string) => void;
}) {
  return (
    <section className="trash-view">
      <h2>Trash</h2>
      <p>
        Offers stay here until you restore or permanently delete them. Rejected
        offers remain in normal browsing.
      </p>
      {offers.length === 0 ? (
        <p>Trash is empty.</p>
      ) : (
        <ul className="offer-list">
          {offers.map((offer) => (
            <li key={offer.id}>
              <a href={`#offer=${offer.id}`}>{offer.name}</a>
              <OfferStatusDisplay offer={offer} />
              <OfferTrashActions
                offer={offer}
                repository={repository}
                onChanged={onRestored}
              />
              <PermanentDeleteAction
                offer={offer}
                repository={deletionRepository}
                onDeleted={onDeleted}
              />
            </li>
          ))}
        </ul>
      )}
      <DeletionCleanupStatus repository={deletionRepository} />
    </section>
  );
}
export function TrashedOffer({
  offer,
  repository,
  onRestored,
  deletionRepository,
  onDeleted,
}: {
  offer: Offer;
  repository: OffersRepository;
  onRestored: (offer: Offer) => void;
  deletionRepository: DeletionsRepository;
  onDeleted: (id: string) => void;
}) {
  return (
    <section className="trash-view">
      <h2>Offer is in Trash</h2>
      <h3>{offer.name}</h3>
      <p>
        Restore this offer to view and edit its retained information, notes and
        photos. Trash has no automatic expiry.
      </p>
      <OfferStatusDisplay offer={offer} />
      <OfferTrashActions
        offer={offer}
        repository={repository}
        onChanged={onRestored}
      />
      <PermanentDeleteAction
        offer={offer}
        repository={deletionRepository}
        onDeleted={onDeleted}
      />
      <a href="#trash">View Trash</a>
    </section>
  );
}

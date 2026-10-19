import { LineBadges } from "../rail/RailBrowser";
import { getStation } from "../rail/network";
import { OfferPhotos } from "../photos/OfferPhotos";
import { OfferNotes } from "../notes/OfferNotes";
import type { NotesRepository } from "../notes/notesRepository";
import { OfferAgentCard } from "./OfferAgentCard";
import {
  OfferPrice,
  OfferSpecs,
  FacilityIndicators,
  PropertyLabel,
} from "./OfferFactsSummary";
import { OfferStatusDisplay } from "./OfferStatusDisplay";
import { OfferStatusEditor } from "./OfferStatusEditor";
import { OfferTrashActions } from "./OfferTrashActions";
import type { Offer, OffersRepository } from "./repository";
import { walkingMinutes } from "./location";
export function OfferDossier({
  offer,
  repository,
  notes,
  onSaved,
  onEdit,
  onBack,
  onTrashed,
  unavailable = false,
}: {
  offer: Offer;
  unavailable?: boolean;
  repository: OffersRepository;
  notes: NotesRepository | null;
  onSaved: (offer: Offer) => void;
  onEdit: () => void;
  onBack: () => void;
  onTrashed: (offer: Offer) => void;
}) {
  const station = offer.stationId ? getStation(offer.stationId) : null;
  const walk =
    offer.walkingMetres === null
      ? "Walking distance unknown"
      : `${offer.walkingMetres.toLocaleString("en-GB")} m · estimated ${walkingMinutes(offer.walkingMetres)} min walk`;
  return (
    <article className="offer-dossier">
      <header className="dossier-bar">
        <button className="icon-button" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <div className="dossier-crumb">
          <span>{station?.name ?? "Station not assigned"}</span>
          <small>
            {offer.walkingMetres === null
              ? "Distance unknown"
              : `${offer.walkingMetres.toLocaleString("en-GB")} m away`}
          </small>
        </div>
        <OfferStatusDisplay offer={offer} compact />
      </header>
      <OfferPhotos
        key={`photos-${offer.id}`}
        offerId={offer.id}
        readOnly={unavailable}
      >
        <h2 className="dossier-name">{offer.name}</h2>
        <p className="dossier-type">
          <PropertyLabel type={offer.propertyType} />
        </p>
        <div className="dossier-location">
          <p>{walk}</p>
          {station && <LineBadges station={station} />}
        </div>
        <OfferPrice rent={offer.rent} />
        <div className="dossier-status">
          <OfferStatusDisplay offer={offer} detailsOnly />
          <OfferStatusEditor
            offer={offer}
            repository={repository}
            onSaved={onSaved}
            unavailable={unavailable}
          />
        </div>
        <OfferSpecs offer={offer} />
        <section className="dossier-section">
          <h3>Facilities</h3>
          <FacilityIndicators offer={offer} />
          {offer.extraFacilities.length > 0 && (
            <ul className="facility-chips">
              {offer.extraFacilities.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          )}
        </section>
        {notes && (
          <OfferNotes
            key={`notes-${offer.id}`}
            offerId={offer.id}
            repository={notes}
            unavailable={unavailable}
          />
        )}
        <section className="dossier-section">
          <h3>Agent</h3>
          <OfferAgentCard key={`agent-${offer.id}`} offer={offer} />
        </section>
      </OfferPhotos>
      <footer className="dossier-footer">
        <button
          className="button secondary"
          disabled={unavailable}
          onClick={onEdit}
        >
          Edit offer
        </button>
        {!unavailable && (
          <OfferTrashActions
            offer={offer}
            repository={repository}
            onChanged={onTrashed}
          />
        )}
        <a className="quiet-link" href={`#offer=${offer.id}`}>
          Direct link to offer
        </a>
        <small>
          Added{" "}
          {new Date(offer.createdAt).toLocaleDateString("en-GB", {
            timeZone: "Asia/Bangkok",
          })}{" "}
          · Updated{" "}
          {new Date(offer.updatedAt).toLocaleDateString("en-GB", {
            timeZone: "Asia/Bangkok",
          })}
        </small>
      </footer>
    </article>
  );
}

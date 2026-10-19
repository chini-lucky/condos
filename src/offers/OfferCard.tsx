import { OfferStatusContext } from "./OfferStatusContext";
import { OfferCover } from "../photos/OfferPhotos";
import {
  FacilityIndicators,
  OfferPrice,
  PropertyLabel,
} from "./OfferFactsSummary";
import { OfferStatusDisplay } from "./OfferStatusDisplay";
import { walkingMinutes } from "./location";
import type { Offer } from "./repository";
export function OfferCard({ offer }: { offer: Offer }) {
  const minutes = walkingMinutes(offer.walkingMetres);
  return (
    <div className="offer-card">
      <OfferCover offerId={offer.id} name={offer.name} />
      <div className="offer-card-main">
        <a
          className="offer-card-name"
          href={`#offer=${offer.id}`}
          aria-label={offer.name}
        >
          {offer.name}
        </a>
        <p className="offer-card-meta">
          <span>
            {offer.walkingMetres === null
              ? "Walking distance unknown"
              : `${offer.walkingMetres.toLocaleString("en-GB")} m · estimated ${minutes} min walk`}
          </span>{" "}
          · <PropertyLabel type={offer.propertyType} />
        </p>
        <div className="offer-card-bottom">
          <FacilityIndicators offer={offer} compact />
          <OfferStatusDisplay offer={offer} compact />
        </div>
        <OfferStatusContext offer={offer} concise />
      </div>
      <OfferPrice rent={offer.rent} compact />
    </div>
  );
}

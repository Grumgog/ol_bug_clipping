import { Feature } from "ol";
import { Polygon } from "ol/geom";
import ImageLayer from "ol/layer/Image";
import VectorLayer from "ol/layer/Vector";
import { Projection, transformExtent } from "ol/proj";
import Static from "ol/source/ImageStatic";
import VectorSource from "ol/source/Vector";
import { useGeographic } from "ol/proj";
import { fromExtent } from "ol/geom/Polygon";
import {
  Select,
  Translate,
  defaults as defaultsInteraction,
} from "ol/interaction";
import TileLayer from "ol/layer/Tile";
import { OSM } from "ol/source";
import { Map, View } from "ol";
import { getVectorContext } from "ol/render";
import Fill from "ol/style/Fill";
import Style from "ol/style/Style";

import catImage from "./cat.image";

// MapImage class
export class MapImage {
  _layer;
  _clipLayer;
  _dataUrl;
  _imageProjection;
  _feature;

  get layer() {
    return this._layer;
  }

  get feature() {
    return this._feature;
  }

  constructor(dataUrl, imageProjection, points) {
    this._dataUrl = dataUrl;
    this._imageProjection = imageProjection;

    const polygon = new Polygon(points);
    this._feature = new Feature(polygon);

    this._clipLayer = new VectorLayer({
      source: new VectorSource({
        features: [this._feature],
      }),
    });

    const extent = polygon.getExtent();

    this._layer = new ImageLayer({
      source: new Static({
        url: this._dataUrl,
        projection: this._imageProjection,
        imageExtent: transformExtent(extent, "EPSG:4326", "EPSG:3857"),
      }),
    });
  }

  updateSource() {
    const position = this.feature.getGeometry()?.getExtent();

    this._layer.setSource(
      new Static({
        url: this._dataUrl,
        projection: this._imageProjection,
        imageExtent: transformExtent(position, "EPSG:4326", "EPSG:3857"),
      })
    );
  }



  static async InitByDataURL(dataUrl, coordinates) {
    const image = new Image();
    image.src = dataUrl;

    const size = await asyncExecutor(image, "onload", (image) => {
      return { width: image.width, height: image.height };
    });

    const projection = new Projection({
      code: "custom-image",
      units: "pixels",
      extent: [0, 0, size.width, size.height],
    });

    const mapImage = new MapImage(dataUrl, projection, coordinates);

    return mapImage;
  }
}

// Util for handle event
async function asyncExecutor(object, prop, handler) {
  let resolve;
  const promise = new Promise((resolver) => (resolve = resolver));

  object[prop] = () => {
    const result = handler(object);
    resolve(result);
  };

  return promise;
}


/// Map settings

useGeographic();

const layer = await MapImage.InitByDataURL(
  catImage,
  fromExtent([0, 0, 20, 20]).getCoordinates()
);

const select = new Select();

const translate = new Translate({
  features: select.getFeatures(),
});

translate.on("translating", (event) => {
  layer.updateSource();
});

const map = new Map({
  interactions: defaultsInteraction().extend([select, translate]),
  controls: [],
  layers: [
    new TileLayer({
      className: "background",
      source: new OSM(),
    }),
    layer.layer,
    layer._clipLayer,
  ],
  target: "map",
  view: new View({
    center: [0, 0],
    zoom: 2,
  }),
});

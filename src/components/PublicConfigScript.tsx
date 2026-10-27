import { connection } from 'next/server'
import { PUBLIC_CONFIG_ELEMENT_ID, getPublicConfig, serializePublicConfig } from '@/lib/public-config'

/**
 * Dépose la configuration publique dans le HTML, à chaque rendu serveur, pour
 * que le navigateur la lise au lieu de valeurs figées à la construction de
 * l'image. Rendu avant tout code client qui pourrait en avoir besoin.
 *
 * `connection()` retire les pages de la génération statique : sans cela, leur
 * HTML serait produit au build, et la configuration figée avec lui.
 */
export async function PublicConfigScript() {
  await connection()

  return (
    <script
      id={PUBLIC_CONFIG_ELEMENT_ID}
      type="application/json"
      dangerouslySetInnerHTML={{ __html: serializePublicConfig(getPublicConfig()) }}
    />
  )
}

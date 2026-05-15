'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import { ChevronDown, ChevronRight, Search, X, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLanguage } from '@/context/LanguageContext';

// ─────────────────────────────────────────────────────────
// Bulbapedia sprite URL generator — uses Special:FilePath
// which server-side redirects to the correct hash path.
// Only overrides for medals whose Bulbapedia file name
// differs from their medal ID are listed.
// ─────────────────────────────────────────────────────────
const BULBA_OVERRIDES = {
    'Fisher': 'Fisherman',
    'Kanto': 'Region',
    'Picnicker': 'Picknicker',
    'Butterfly Collector': 'Vivillon_Collector',
    'Rail Staff': 'Depot_Agent',
};
const BULBA_TIER = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' };

function getMedalSpriteUrl(medalId, tier) {
    const bulbaName = BULBA_OVERRIDES[medalId] || medalId.replace(/ /g, '_');
    const bulbaTier = BULBA_TIER[tier] || 'Bronze';
    return `https://archives.bulbagarden.net/wiki/Special:FilePath/GO_${encodeURIComponent(bulbaName)}_${bulbaTier}_Medal.png`;
}

// ─────────────────────────────────────────────────────────
// Medal definitions — flat list, no categories
// thresholds = [bronze, silver, gold, platinum]
// ─────────────────────────────────────────────────────────
export const MEDALS = [
    { id: 'Jogger',                    name: 'Joggeur',                    nameEn: 'Jogger',                    nameJa: 'ジョギング',               description: 'Parcourir {n} km',                          descEn: 'Walk {n} km',                            descJa: '{n}km歩く',                              thresholds: [10, 100, 1000, 10000] },
    { id: 'Collector',                 name: 'Collectionneur',             nameEn: 'Collector',                 nameJa: 'コレクター',               description: 'Attraper {n} Pokémon',                      descEn: 'Catch {n} Pokémon',                      descJa: '{n}匹のポケモンを捕まえる',               thresholds: [30, 500, 2000, 50000] },
    { id: 'Scientist',                 name: 'Scientifique',               nameEn: 'Scientist',                 nameJa: 'けんきゅういん',           description: 'Faire évoluer {n} Pokémon',                 descEn: 'Evolve {n} Pokémon',                     descJa: '{n}匹のポケモンを進化させる',             thresholds: [3, 20, 200, 2000] },
    { id: 'Breeder',                   name: 'Éleveur',                    nameEn: 'Breeder',                   nameJa: 'ブリーダー',               description: 'Faire éclore {n} Œufs',                     descEn: 'Hatch {n} Eggs',                         descJa: '{n}個のタマゴを孵す',                     thresholds: [10, 100, 500, 2500] },
    { id: 'Backpacker',                name: 'Randonneur',                 nameEn: 'Backpacker',                nameJa: 'バックパッカー',           description: 'Visiter {n} PokéStops',                     descEn: 'Visit {n} PokéStops',                    descJa: '{n}のポケストップを訪れる',               thresholds: [100, 1000, 2000, 50000] },
    { id: 'Sightseer',                 name: 'Vacancier',                  nameEn: 'Sightseer',                 nameJa: 'おもてなし',               description: 'Visiter {n} PokéStops uniques',             descEn: 'Visit {n} unique PokéStops',             descJa: '{n}のユニークなポケストップを訪れる',     thresholds: [10, 100, 1000, 2000] },
    { id: 'Fisher',                    name: 'Pêcheur',                    nameEn: 'Fisherman',                 nameJa: 'つりびと',                 description: 'Attraper {n} Magicarpe géants',             descEn: 'Catch {n} big Magikarp',                 descJa: '大きなコイキングを{n}匹捕まえる',         thresholds: [3, 50, 300, 1000] },
    { id: 'Battle Girl',               name: 'Combattante',                nameEn: 'Battle Girl',               nameJa: 'バトルガール',             description: 'Gagner {n} combats d\'Arène',               descEn: 'Win {n} Gym battles',                    descJa: '{n}回ジムバトルに勝利',                   thresholds: [10, 100, 1000, 4000] },
    { id: 'Ace Trainer',               name: 'Top Dresseur',               nameEn: 'Ace Trainer',               nameJa: 'エリートトレーナー',       description: 'S\'entraîner {n} fois',                     descEn: 'Train {n} times',                        descJa: '{n}回トレーニングする',                   thresholds: [10, 100, 1000, 2000] },
    { id: 'Youngster',                 name: 'Gamin',                      nameEn: 'Youngster',                 nameJa: 'たんパンこぞう',           description: 'Attraper {n} Rattata minuscules',           descEn: 'Catch {n} tiny Rattata',                 descJa: '小さなコラッタを{n}匹捕まえる',           thresholds: [3, 50, 300, 1000] },
    { id: 'Pikachu Fan',               name: 'Fan de Pikachu',             nameEn: 'Pikachu Fan',               nameJa: 'ピカチュウファン',         description: 'Attraper {n} Pikachu',                      descEn: 'Catch {n} Pikachu',                      descJa: 'ピカチュウを{n}匹捕まえる',               thresholds: [3, 50, 300, 1000] },
    { id: 'Unown',                     name: 'Zarbi',                      nameEn: 'Unown',                     nameJa: 'アンノーン',               description: 'Attraper {n} Zarbi',                        descEn: 'Catch {n} Unown',                        descJa: 'アンノーンを{n}匹捕まえる',               thresholds: [3, 10, 26, 28] },
    { id: 'Triathlete',                name: 'Triathlète',                 nameEn: 'Triathlete',                nameJa: 'トライアスリート',         description: 'Série de 7 jours {n} fois',                 descEn: 'Complete a 7-day streak {n} times',      descJa: '7日間連続を{n}回達成',                    thresholds: [1, 10, 50, 100] },
    { id: 'Tiny Pokémon Collector',     name: 'Collectionneur de petits Pokémon', nameEn: 'Tiny Pokémon Collector',     nameJa: 'XXSコレクター',           description: 'Attraper {n} Pokémon XXS',                  descEn: 'Catch {n} XXS Pokémon',                  descJa: 'XXSポケモンを{n}匹捕まえる',              thresholds: [5, 25, 100, 500] },
    { id: 'Jumbo Pokémon Collector',    name: 'Collectionneur de Pokémon géants', nameEn: 'Jumbo Pokémon Collector',    nameJa: 'XXLコレクター',           description: 'Attraper {n} Pokémon XXL',                  descEn: 'Catch {n} XXL Pokémon',                  descJa: 'XXLポケモンを{n}匹捕まえる',              thresholds: [5, 25, 100, 500] },
    { id: 'Kanto',                     name: 'Kanto',                      nameEn: 'Kanto',                     nameJa: 'カントー',                 description: 'Pokédex Kanto : {n}',                       descEn: 'Register {n} Kanto Pokémon',             descJa: 'カントーのポケモン{n}匹を登録',           thresholds: [5, 50, 100, 151] },
    { id: 'Johto',                     name: 'Johto',                      nameEn: 'Johto',                     nameJa: 'ジョウト',                 description: 'Pokédex Johto : {n}',                       descEn: 'Register {n} Johto Pokémon',             descJa: 'ジョウトのポケモン{n}匹を登録',           thresholds: [5, 30, 70, 100] },
    { id: 'Hoenn',                     name: 'Hoenn',                      nameEn: 'Hoenn',                     nameJa: 'ホウエン',                 description: 'Pokédex Hoenn : {n}',                       descEn: 'Register {n} Hoenn Pokémon',             descJa: 'ホウエンのポケモン{n}匹を登録',           thresholds: [5, 40, 90, 135] },
    { id: 'Sinnoh',                    name: 'Sinnoh',                     nameEn: 'Sinnoh',                    nameJa: 'シンオウ',                 description: 'Pokédex Sinnoh : {n}',                      descEn: 'Register {n} Sinnoh Pokémon',            descJa: 'シンオウのポケモン{n}匹を登録',           thresholds: [5, 30, 80, 107] },
    { id: 'Unova',                     name: 'Unys',                       nameEn: 'Unova',                     nameJa: 'イッシュ',                 description: 'Pokédex Unys : {n}',                        descEn: 'Register {n} Unova Pokémon',             descJa: 'イッシュのポケモン{n}匹を登録',           thresholds: [5, 50, 100, 156] },
    { id: 'Kalos',                     name: 'Kalos',                      nameEn: 'Kalos',                     nameJa: 'カロス',                   description: 'Pokédex Kalos : {n}',                       descEn: 'Register {n} Kalos Pokémon',             descJa: 'カロスのポケモン{n}匹を登録',             thresholds: [5, 25, 50, 72] },
    { id: 'Alola',                     name: 'Alola',                      nameEn: 'Alola',                     nameJa: 'アローラ',                 description: 'Pokédex Alola : {n}',                       descEn: 'Register {n} Alola Pokémon',             descJa: 'アローラのポケモン{n}匹を登録',           thresholds: [5, 25, 50, 86] },
    { id: 'Galar',                     name: 'Galar',                      nameEn: 'Galar',                     nameJa: 'ガラル',                   description: 'Pokédex Galar : {n}',                       descEn: 'Register {n} Galar Pokémon',             descJa: 'ガラルのポケモンを登録',                  thresholds: [5, 25, 50, 89] },
    { id: 'Hisui',                     name: 'Hisui',                      nameEn: 'Hisui',                     nameJa: 'ヒスイ',                   description: 'Pokédex Hisui : {n}',                       descEn: 'Register {n} Hisui Pokémon',             descJa: 'ヒスイのポケモンを登録',                  thresholds: [1, 3, 5, 7] },
    { id: 'Paldea',                    name: 'Paldea',                     nameEn: 'Paldea',                    nameJa: 'パルデア',                 description: 'Pokédex Paldea : {n}',                      descEn: 'Register {n} Paldea Pokémon',            descJa: 'パルデアのポケモンを登録',                thresholds: [5, 30, 80, 103] },
    { id: 'Champion',                  name: 'Maître',                     nameEn: 'Champion',                  nameJa: 'チャンピオン',             description: 'Gagner {n} Raids',                          descEn: 'Win {n} Raids',                          descJa: '{n}回レイドに勝利',                       thresholds: [10, 100, 1000, 2000] },
    { id: 'Battle Legend',             name: 'Combattant légendaire',      nameEn: 'Battle Legend',             nameJa: 'バトルレジェンド',         description: 'Gagner {n} Raids Légendaires',              descEn: 'Win {n} Legendary Raids',                descJa: '{n}回伝説レイドに勝利',                   thresholds: [10, 100, 1000, 2000] },
    { id: 'Berry Master',              name: 'Maître des Baies',           nameEn: 'Berry Master',              nameJa: 'きのみマスター',           description: 'Donner {n} Baies dans les Arènes',          descEn: 'Feed {n} Berries in Gyms',               descJa: 'ジムで{n}個のきのみを与える',             thresholds: [10, 100, 1000, 15000] },
    { id: 'Gym Leader',                name: 'Champion d\'Arène',          nameEn: 'Gym Leader',                nameJa: 'ジムリーダー',             description: 'Défendre des Arènes {n} heures',            descEn: 'Defend Gyms for {n} hours',              descJa: 'ジムを{n}時間防衛する',                   thresholds: [10, 100, 1000, 15000] },
    { id: 'Great League Veteran',      name: 'Vénérable Ligue Super',      nameEn: 'Great League Veteran',      nameJa: 'スーパーリーグベテラン',   description: 'Gagner {n} combats Ligue Super',            descEn: 'Win {n} Great League battles',           descJa: 'スーパーリーグで{n}回勝利',               thresholds: [5, 50, 200, 1000] },
    { id: 'Ultra League Veteran',      name: 'Vénérable Ligue Hyper',      nameEn: 'Ultra League Veteran',      nameJa: 'ハイパーリーグベテラン',   description: 'Gagner {n} combats Ligue Hyper',            descEn: 'Win {n} Ultra League battles',           descJa: 'ハイパーリーグで{n}回勝利',               thresholds: [5, 50, 200, 1000] },
    { id: 'Master League Veteran',     name: 'Vénérable Ligue Master',     nameEn: 'Master League Veteran',     nameJa: 'マスターリーグベテラン',   description: 'Gagner {n} combats Ligue Master',           descEn: 'Win {n} Master League battles',          descJa: 'マスターリーグで{n}回勝利',               thresholds: [5, 50, 200, 1000] },
    { id: 'Rising Star',               name: 'Dresseur en Herbe',          nameEn: 'Rising Star',               nameJa: 'ライジングスター',         description: 'Battre {n} espèces en raid',                descEn: 'Defeat {n} species in raids',            descJa: 'レイドで{n}種類のポケモンを倒す',         thresholds: [2, 10, 50, 150] },
    { id: 'Rising Star Duo',           name: 'Dresseurs en Herbe',         nameEn: 'Rising Star Duo',           nameJa: 'ライジングスターデュオ',   description: 'Gagner {n} raids avec un ami',              descEn: 'Win {n} raids with a friend',            descJa: 'フレンドと{n}回レイドに勝利',             thresholds: [2, 10, 50, 100] },
    { id: 'Raid Expert',               name: 'Expert en Raids',            nameEn: 'Raid Expert',               nameJa: 'レイドエキスパート',       description: 'Obtenir {n} exploits en Raid',              descEn: 'Earn {n} Raid achievements',             descJa: '{n}のレイド実績を獲得',                   thresholds: [1, 50, 200, 500] },
    { id: 'Idol',                      name: 'Star',                       nameEn: 'Idol',                      nameJa: 'アイドル',                 description: 'Meilleur Ami avec {n} Dresseurs',           descEn: 'Best Friends with {n} Trainers',         descJa: '{n}人のトレーナーと大親友になる',          thresholds: [1, 2, 3, 20] },
    { id: 'Gentleman',                 name: 'Gentleman',                  nameEn: 'Gentleman',                 nameJa: 'ジェントルマン',           description: 'Échanger {n} Pokémon',                      descEn: 'Trade {n} Pokémon',                      descJa: '{n}匹のポケモンを交換する',               thresholds: [10, 100, 1000, 2500] },
    { id: 'Pilot',                     name: 'Pilote',                     nameEn: 'Pilot',                     nameJa: 'パイロット',               description: '{n} km via les échanges',                   descEn: 'Earn {n} km through trades',             descJa: '交換で{n}kmを獲得',                       thresholds: [1000, 100000, 1000000, 10000000] },
    { id: 'Pokémon Ranger',            name: 'Pokémon Ranger',             nameEn: 'Pokémon Ranger',            nameJa: 'ポケモンレンジャー',       description: 'Terminer {n} études de terrain',            descEn: 'Complete {n} Field Research',            descJa: '{n}のフィールドリサーチを完了',           thresholds: [10, 100, 1000, 2500] },
    { id: 'Cameraman',                 name: 'Caméraman',                  nameEn: 'Cameraman',                 nameJa: 'カメラマン',               description: '{n} rencontres surprises',                  descEn: '{n} surprise encounters',                descJa: '{n}回のサプライズエンカウント',           thresholds: [10, 50, 200, 400] },
    { id: 'Friend Finder',             name: 'Parrainage',                 nameEn: 'Friend Finder',             nameJa: 'フレンドファインダー',     description: 'Parrainer {n} Dresseurs',                   descEn: 'Refer {n} Trainers',                     descJa: '{n}人のトレーナーを紹介',                 thresholds: [1, 10, 20, 50] },
    { id: 'Best Buddy',                name: 'Meilleur Copain',            nameEn: 'Best Buddy',                nameJa: 'ベストバディ',             description: '{n} Meilleurs Copains',                     descEn: '{n} Best Buddies',                       descJa: '{n}匹のベストバディ',                     thresholds: [1, 10, 100, 200] },
    { id: 'Hero',                      name: 'Héros',                      nameEn: 'Hero',                      nameJa: 'ヒーロー',                 description: 'Battre {n} Sbires Rocket',                  descEn: 'Defeat {n} Team GO Rocket Grunts',       descJa: 'ロケット団したっぱを{n}人倒す',           thresholds: [10, 100, 1000, 2000] },
    { id: 'Ultra Hero',                name: 'Ultra-Héros',                nameEn: 'Ultra Hero',                nameJa: 'ウルトラヒーロー',         description: 'Battre Giovanni {n} fois',                  descEn: 'Defeat Giovanni {n} times',              descJa: 'ロケット団ボスを{n}回倒す',               thresholds: [1, 5, 20, 50] },
    { id: 'Purifier',                  name: 'Purificateur',               nameEn: 'Purifier',                  nameJa: 'リトレーナー',             description: 'Purifier {n} Pokémon Obscurs',              descEn: 'Purify {n} Shadow Pokémon',              descJa: 'シャドウポケモンを{n}匹リトレーン',       thresholds: [5, 50, 500, 1000] },
    { id: 'Successor',                 name: 'Héritier',                   nameEn: 'Successor',                 nameJa: 'サクセサー',               description: 'Méga-évoluer {n} fois',                     descEn: 'Mega Evolve {n} times',                  descJa: 'ポケモンを{n}回メガシンカさせる',         thresholds: [1, 50, 500, 1000] },
    { id: 'Mega Evolution Guru',       name: 'Gourou Méga-Évolution',      nameEn: 'Mega Evolution Guru',       nameJa: 'メガシンカグル',           description: 'Méga-évoluer {n} espèces',                  descEn: 'Mega Evolve {n} different species',      descJa: '{n}種類のポケモンをメガシンカさせる',     thresholds: [1, 24, 36, 46] },
    { id: 'Expert Navigator',          name: 'Expert Navigation',          nameEn: 'Expert Navigator',          nameJa: 'エキスパートナビゲーター', description: 'Compléter {n} Itinéraires',                 descEn: 'Complete {n} Routes',                    descJa: '{n}のルートを完了する',                   thresholds: [10, 50, 200, 600] },
    { id: 'Wayfarer',                  name: 'Wayfarer',                   nameEn: 'Wayfarer',                  nameJa: 'ウェイファーラー',         description: '{n} accords Wayfarer',                      descEn: 'Earn {n} Wayfarer agreements',           descJa: 'ウェイファーラーで{n}の合意を獲得',       thresholds: [50, 500, 1000, 1500] },
    { id: 'Picnicker',                 name: 'Fan de Pique-Nique',         nameEn: 'Picnicker',                 nameJa: 'ピクニックガール',         description: 'Leurre : aider à attraper {n} Pokémon',     descEn: 'Use Lure to help catch {n} Pokémon',     descJa: 'ルアーを使って{n}匹捕獲',                 thresholds: [5, 25, 500, 2500] },
    { id: 'Butterfly Collector',       name: 'Coll. de Prismillon',        nameEn: 'Vivillon Collector',        nameJa: 'ビビヨンコレクター',       description: 'Collectionner {n} motifs Prismillon',       descEn: 'Collect {n} Vivillon patterns',          descJa: 'ビビヨンの模様を{n}種類集める',           thresholds: [1, 5, 10, 18] },
    { id: 'Showcase Star',             name: 'Star de Concours',           nameEn: 'Showcase Star',             nameJa: 'コンテストスター',         description: 'Gagner {n} Épreuves PokéStop',              descEn: 'Win {n} PokéStop Showcases',             descJa: '{n}回ポケストップコンテストに勝利',       thresholds: [1, 10, 50, 100] },
    { id: 'Life of the Party',         name: 'Fêtard',                     nameEn: 'Life of the Party',         nameJa: 'パーティーの主役',         description: 'Terminer {n} Défis de fête',                descEn: 'Complete {n} Party Challenges',          descJa: '{n}のパーティーチャレンジを完了',         thresholds: [10, 50, 100, 200] },
    { id: 'Community Member',          name: 'Membre Communauté',          nameEn: 'Community Member',          nameJa: 'コミュニティメンバー',     description: 'Check-in Ambassadeurs : {n}',               descEn: 'Check-in with Ambassadors {n} times',   descJa: 'アンバサダーと{n}回チェックイン',         thresholds: [1, 20, 50, 100] },
    { id: 'Schoolkid',                 name: 'Élève',                      nameEn: 'Schoolkid',                 nameJa: 'じゅくがえり',             description: 'Type Normal',                               descEn: 'Normal type',                            descJa: 'ノーマルタイプ',                          thresholds: [10, 50, 200, 2500] },
    { id: 'Black Belt',                name: 'Karatéka',                   nameEn: 'Black Belt',                nameJa: 'カラテおう',               description: 'Type Combat',                               descEn: 'Fighting type',                          descJa: 'かくとうタイプ',                          thresholds: [10, 50, 200, 2500] },
    { id: 'Bird Keeper',               name: 'Ornithologue',               nameEn: 'Bird Keeper',               nameJa: 'とりつかい',               description: 'Type Vol',                                  descEn: 'Flying type',                            descJa: 'ひこうタイプ',                            thresholds: [10, 50, 200, 2500] },
    { id: 'Punk Girl',                 name: 'Vaurienne',                  nameEn: 'Punk Girl',                 nameJa: 'スキンヘッズ',             description: 'Type Poison',                               descEn: 'Poison type',                            descJa: 'どくタイプ',                              thresholds: [10, 50, 200, 2500] },
    { id: 'Ruin Maniac',               name: 'Ruinemaniac',                nameEn: 'Ruin Maniac',               nameJa: 'いせきマニア',             description: 'Type Sol',                                  descEn: 'Ground type',                            descJa: 'じめんタイプ',                            thresholds: [10, 50, 200, 2500] },
    { id: 'Hiker',                     name: 'Montagnard',                 nameEn: 'Hiker',                     nameJa: 'やまおとこ',               description: 'Type Roche',                                descEn: 'Rock type',                              descJa: 'いわタイプ',                              thresholds: [10, 50, 200, 2500] },
    { id: 'Bug Catcher',               name: 'Scout',                      nameEn: 'Bug Catcher',               nameJa: 'むしとりしょうねん',       description: 'Type Insecte',                              descEn: 'Bug type',                               descJa: 'むしタイプ',                              thresholds: [10, 50, 200, 2500] },
    { id: 'Hex Maniac',                name: 'Saltimbanque',               nameEn: 'Hex Maniac',                nameJa: 'オカルトマニア',           description: 'Type Spectre',                              descEn: 'Ghost type',                             descJa: 'ゴーストタイプ',                          thresholds: [10, 50, 200, 2500] },
    { id: 'Rail Staff',                name: 'Contrôleur',                 nameEn: 'Rail Staff',                nameJa: 'てつどういん',             description: 'Type Acier',                                descEn: 'Steel type',                             descJa: 'はがねタイプ',                            thresholds: [10, 50, 200, 2500] },
    { id: 'Kindler',                   name: 'Boutefeu',                   nameEn: 'Kindler',                   nameJa: 'キャンプファイヤー',       description: 'Type Feu',                                  descEn: 'Fire type',                              descJa: 'ほのおタイプ',                            thresholds: [10, 50, 200, 2500] },
    { id: 'Swimmer',                   name: 'Nageur',                     nameEn: 'Swimmer',                   nameJa: 'かいパンやろう',           description: 'Type Eau',                                  descEn: 'Water type',                             descJa: 'みずタイプ',                              thresholds: [10, 50, 200, 2500] },
    { id: 'Gardener',                  name: 'Jardinier',                  nameEn: 'Gardener',                  nameJa: 'アロマなおねえさん',       description: 'Type Plante',                               descEn: 'Grass type',                             descJa: 'くさタイプ',                              thresholds: [10, 50, 200, 2500] },
    { id: 'Rocker',                    name: 'Rocker',                     nameEn: 'Rocker',                    nameJa: 'ギタリスト',               description: 'Type Électrik',                             descEn: 'Electric type',                          descJa: 'でんきタイプ',                            thresholds: [10, 50, 200, 2500] },
    { id: 'Psychic',                   name: 'Kinésiste',                  nameEn: 'Psychic',                   nameJa: 'サイキッカー',             description: 'Type Psy',                                  descEn: 'Psychic type',                           descJa: 'エスパータイプ',                          thresholds: [10, 50, 200, 2500] },
    { id: 'Skier',                     name: 'Skieur',                     nameEn: 'Skier',                     nameJa: 'スキーヤー',               description: 'Type Glace',                                descEn: 'Ice type',                               descJa: 'こおりタイプ',                            thresholds: [10, 50, 200, 2500] },
    { id: 'Dragon Tamer',              name: 'Dracologue',                 nameEn: 'Dragon Tamer',              nameJa: 'ドラゴンつかい',           description: 'Type Dragon',                               descEn: 'Dragon type',                            descJa: 'ドラゴンタイプ',                          thresholds: [10, 50, 200, 2500] },
    { id: 'Delinquent',                name: 'Terreur',                    nameEn: 'Delinquent',                nameJa: 'スキンヘッズ♀',           description: 'Type Ténèbres',                             descEn: 'Dark type',                              descJa: 'あくタイプ',                              thresholds: [10, 50, 200, 2500] },
    { id: 'Fairy Tale Girl',           name: 'Mystimaniac',                nameEn: 'Fairy Tale Girl',           nameJa: 'メルヘンしょうじょ',       description: 'Type Fée',                                  descEn: 'Fairy type',                             descJa: 'フェアリータイプ',                        thresholds: [10, 50, 200, 2500] },
];

// ── Helpers ──

function parseVal(v) { return parseInt(String(v).replace(/[\s,]/g, '')) || 0; }

function getTier(value, thresholds) {
    const v = parseVal(value);
    if (v >= thresholds[3]) return 'platinum';
    if (v >= thresholds[2]) return 'gold';
    if (v >= thresholds[1]) return 'silver';
    if (v >= thresholds[0]) return 'bronze';
    return 'none';
}

function getImgUrl(medalId, value, thresholds) {
    const tier = getTier(value, thresholds);
    const displayTier = tier === 'none' ? 'bronze' : tier;
    return getMedalSpriteUrl(medalId, displayTier);
}

const TIER_LABELS = { none: '', bronze: 'Bronze', silver: 'Argent', gold: 'Or', platinum: 'Platine' };
const TIER_COLORS = {
    none: 'text-gray-600',
    bronze: 'text-amber-600',
    silver: 'text-gray-300',
    gold: 'text-yellow-400',
    platinum: 'text-cyan-300',
};
const TIER_BORDERS = {
    none: 'border-white/5',
    bronze: 'border-amber-700/40',
    silver: 'border-gray-300/30',
    gold: 'border-yellow-400/40',
    platinum: 'border-cyan-300/40',
};

// ─────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────

export default function PokemonMedals({ medals = {}, onChange, isAdmin = false, settings = {}, onSettingsChange }) {
    const { t, lang } = useLanguage();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const getName = (m) => lang === 'ja' ? m.nameJa : lang === 'en' ? m.nameEn : m.name;
    const getDesc = (m) => lang === 'ja' ? m.descJa : lang === 'en' ? m.descEn : m.description;

    const handleChange = useCallback((id, raw) => {
        if (!onChange) return;
        onChange({ ...medals, [id]: raw });
    }, [medals, onChange]);

    // Custom medal order (admin only) — stored in settings.medalOrder
    const orderedMedals = useMemo(() => {
        const order = settings.medalOrder;
        if (!order || !Array.isArray(order) || order.length === 0) return MEDALS;
        // Build a map for O(1) lookup
        const byId = {};
        for (const m of MEDALS) byId[m.id] = m;
        // Ordered list: known IDs first, then any new medals not yet in the order
        const ordered = [];
        for (const id of order) { if (byId[id]) ordered.push(byId[id]); }
        for (const m of MEDALS) { if (!order.includes(m.id)) ordered.push(m); }
        return ordered;
    }, [settings.medalOrder]);

    // Summary for collapsed header
    const summary = useMemo(() => {
        let platinum = 0, gold = 0, silver = 0, bronze = 0;
        for (const m of MEDALS) {
            const tier = getTier(medals[m.id], m.thresholds);
            if (tier === 'platinum') platinum++;
            else if (tier === 'gold') gold++;
            else if (tier === 'silver') silver++;
            else if (tier === 'bronze') bronze++;
        }
        return { total: MEDALS.length, platinum, gold, silver, bronze };
    }, [medals]);

    // Filter by search
    const filtered = useMemo(() => {
        if (!search) return orderedMedals;
        const lc = search.toLowerCase();
        return orderedMedals.filter(m =>
            getName(m).toLowerCase().includes(lc) ||
            m.id.toLowerCase().includes(lc) ||
            m.nameEn.toLowerCase().includes(lc)
        );
    }, [search, lang, orderedMedals]);

    // ── Drag & drop (admin only) ──
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const currentOrder = orderedMedals.map(m => m.id);
        const oldIdx = currentOrder.indexOf(active.id);
        const newIdx = currentOrder.indexOf(over.id);
        if (oldIdx === -1 || newIdx === -1) return;
        const newOrder = arrayMove(currentOrder, oldIdx, newIdx);
        onSettingsChange?.({ ...settings, medalOrder: newOrder });
    }, [orderedMedals, settings, onSettingsChange]);

    const canDrag = isAdmin && !search; // disable drag during search

    const gridContent = filtered.map((medal) => (
        <SortableMedalCard
            key={medal.id}
            id={medal.id}
            medal={medal}
            value={medals[medal.id] || ''}
            onChange={handleChange}
            getName={getName}
            getDesc={getDesc}
            lang={lang}
            canDrag={canDrag}
        />
    ));

    return (
        <div className="mb-8 w-full rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-xl overflow-hidden">
            {/* ── Collapsible header ── */}
            <div
                role="button" tabIndex={0}
                onClick={() => setOpen(o => !o)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }}
                className="w-full flex items-center justify-between px-4 md:px-6 py-4 text-left hover:bg-white/10 transition-colors cursor-pointer select-none"
            >
                <div className="flex items-center gap-3">
                    <span className="w-2 h-8 bg-yellow-400 rounded-full flex-shrink-0"></span>
                    {open
                        ? <ChevronDown size={20} className="text-yellow-300 flex-shrink-0" />
                        : <ChevronRight size={20} className="text-yellow-300 flex-shrink-0" />}
                    <div>
                        <h3 className="text-lg md:text-xl font-bold text-white">{t('dashboard.medals')}</h3>
                        <p className="text-xs md:text-sm text-gray-400 mt-0.5">
                            {summary.platinum > 0 && <span className="text-cyan-300 mr-2">{summary.platinum} Platine</span>}
                            {summary.gold > 0 && <span className="text-yellow-400 mr-2">{summary.gold} Or</span>}
                            {summary.silver > 0 && <span className="text-gray-300 mr-2">{summary.silver} Argent</span>}
                            {summary.bronze > 0 && <span className="text-amber-600 mr-2">{summary.bronze} Bronze</span>}
                            {(summary.platinum + summary.gold + summary.silver + summary.bronze) === 0 && (
                                <span>{summary.total} {t('medals.available')}</span>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            {open && (
                <div className="px-4 md:px-6 pb-6">
                    {/* Search */}
                    <div className="relative mb-4 max-w-sm">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('medals.searchPlaceholder')}
                            className="w-full pl-8 pr-8 py-2 text-sm bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Flat medal grid — with drag for admin */}
                    {canDrag ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={filtered.map(m => m.id)} strategy={rectSortingStrategy}>
                                <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2 md:gap-3">
                                    {gridContent}
                                </div>
                            </SortableContext>
                        </DndContext>
                    ) : (
                        <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2 md:gap-3">
                            {gridContent}
                        </div>
                    )}

                    {filtered.length === 0 && (
                        <p className="text-center text-gray-500 py-8 text-sm">
                            {t('medals.notFound')}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// Sortable medal card wrapper
// ─────────────────────────────────────────────────────────

function SortableMedalCard({ id, medal, value, onChange, getName, getDesc, lang, canDrag }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !canDrag });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
    };

    return (
        <div ref={setNodeRef} style={style}>
            <MedalCard
                medal={medal}
                value={value}
                onChange={onChange}
                getName={getName}
                getDesc={getDesc}
                lang={lang}
                dragHandle={canDrag ? { ...attributes, ...listeners } : null}
            />
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// Single medal card
// ─────────────────────────────────────────────────────────

const MedalCard = memo(function MedalCard({ medal, value, onChange, getName, getDesc, lang, dragHandle }) {
    const tier = getTier(value, medal.thresholds);
    const imgUrl = getImgUrl(medal.id, value, medal.thresholds);
    const [imgError, setImgError] = useState(false);
    const val = parseVal(value);
    const next = medal.thresholds.find(t => val < t);

    return (
        <div className={`relative flex flex-col items-center text-center group bg-black/20 p-2 rounded-xl border ${TIER_BORDERS[tier]} hover:border-white/20 transition-all`}>
            {/* Drag handle (admin only) */}
            {dragHandle && (
                <div {...dragHandle} className="absolute top-0.5 right-0.5 cursor-grab active:cursor-grabbing text-gray-500 hover:text-yellow-400 transition-colors z-10 touch-none">
                    <GripVertical size={10} />
                </div>
            )}

            {/* Medal sprite */}
            <div className={`w-10 h-10 flex items-center justify-center mb-1 transform group-hover:scale-110 transition-transform duration-300 ${tier === 'none' ? 'opacity-30 grayscale' : ''}`}>
                {imgUrl && !imgError ? (
                    <img
                        src={imgUrl}
                        alt={getName(medal)}
                        className="w-full h-full object-contain drop-shadow-lg"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-xs border-2 border-slate-500">
                        {getName(medal).charAt(0)}
                    </div>
                )}
            </div>

            {/* Name */}
            <span className="text-[9px] text-gray-300 font-medium leading-tight mb-0.5 h-5 flex items-center justify-center w-full overflow-hidden line-clamp-2">
                {getName(medal)}
            </span>

            {/* Tier label */}
            {tier !== 'none' && (
                <span className={`text-[7px] font-bold uppercase tracking-wider mb-0.5 ${TIER_COLORS[tier]}`}>
                    {TIER_LABELS[tier]}
                </span>
            )}

            {/* Input */}
            <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={value}
                onChange={(e) => onChange(medal.id, e.target.value)}
                className={`w-full px-1 py-0.5 text-center text-[10px] bg-black/40 border rounded text-white focus:outline-none focus:border-yellow-500 transition-colors ${TIER_BORDERS[tier]}`}
            />

            {/* Tooltip */}
            <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black/95 text-white text-[10px] p-2.5 rounded-lg w-36 z-50 border border-white/10 shadow-xl pointer-events-none">
                <p className="font-bold mb-1 text-yellow-300">{getName(medal)}</p>
                <p className="mb-1.5 text-gray-300">{getDesc(medal).replace('{n}', medal.thresholds[3].toLocaleString())}</p>
                <div className="flex flex-col gap-0.5 text-[9px]">
                    {['Bronze', 'Argent', 'Or', 'Platine'].map((label, i) => {
                        const reached = val >= medal.thresholds[i];
                        return (
                            <div key={i} className={`flex justify-between ${reached ? 'text-white' : 'text-gray-500'}`}>
                                <span>{reached ? '✓ ' : ''}{label}</span>
                                <span>{medal.thresholds[i].toLocaleString()}</span>
                            </div>
                        );
                    })}
                </div>
                {next != null && (
                    <p className="mt-1.5 pt-1 border-t border-white/10 text-gray-400">
                        {t('medals.next')}: <span className="text-white">{next.toLocaleString()}</span>
                    </p>
                )}
            </div>
        </div>
    );
});

import type { Book } from './library'
import { localDay } from './library'

/**
 * Book facts for the dashboard (#101). A new one comes with each reading
 * day: the fact shown is picked by how many days are in the reading log, so
 * reading today moves it on, and a day without reading keeps the last one.
 */
export const FACTS: string[] = [
  'Tsundoku is a Japanese word for buying books and letting them pile up unread.',
  'Mary Shelley began writing Frankenstein when she was 18, after a ghost-story contest with friends at Lake Geneva in 1816.',
  'The smell of old books comes partly from the paper breaking down; one of the substances it gives off smells faintly of vanilla.',
  'Agatha Christie is the best-selling novelist of all time, with an estimated two billion copies sold.',
  'In Dutch and German, the title on a book’s spine usually runs from bottom to top; in English it runs from top to bottom.',
  'Tolkien wrote the first line of The Hobbit on a blank page of an exam paper he was marking.',
  'Dr. Seuss wrote Green Eggs and Ham using just 50 different words, after a bet with his publisher.',
  'Jane Austen’s novels came out without her name on them: Sense and Sensibility was “By a Lady”.',
  'Charlotte, Emily and Anne Brontë first published as Currer, Ellis and Acton Bell.',
  'Arthur Conan Doyle killed off Sherlock Holmes in 1893, and brought him back years later after readers kept asking.',
  'Alice’s Adventures in Wonderland began as a story Lewis Carroll told Alice Liddell and her sisters on a boat trip in 1862.',
  'Fahrenheit 451 is named after the temperature at which Ray Bradbury was told book paper catches fire.',
  'Ray Bradbury typed the first draft of Fahrenheit 451 on a rented typewriter in a library basement, at ten cents per half hour.',
  'Stephen King threw the first pages of Carrie in the bin; his wife Tabitha fished them out and told him to keep going.',
  'The first Harry Potter book had a first print run of just 500 copies, and many of them went to libraries.',
  'Agatha Christie’s play The Mousetrap has been running in London’s West End since 1952.',
  'When Agatha Christie killed off Hercule Poirot in 1975, The New York Times printed an obituary for him.',
  'In Iceland, the Jólabókaflóð (“Christmas book flood”) means giving books on Christmas Eve and reading them that night.',
  'During the Dutch Boekenweek, you get a free book, the Boekenweekgeschenk, when you buy a book.',
  'The Lord of the Rings was published in three parts because paper was scarce and costly after the war; Tolkien saw it as one book.',
  'Tolkien worked on The Lord of the Rings for about twelve years.',
  'Gilded page edges are not just pretty: the smooth gold helps keep dust and damp out of the pages.',
  'Coloured and patterned page edges, called sprayed or stained edges, go back centuries; they hid dirt from many hands.',
  'The ISBN, the number that identifies a book, was introduced in 1970 and has had 13 digits since 2007.',
  'Most adults read silently at around 240 words a minute.',
  'The Very Hungry Caterpillar by Eric Carle has sold more than 50 million copies.',
  'The Book of Kells, made by monks around the year 800, is kept at Trinity College Dublin.',
  'The library of al-Qarawiyyin in Fez, Morocco, founded in 859, is often called the oldest working library in the world.',
  'Penguin’s first paperbacks in 1935 cost sixpence, about the price of a packet of cigarettes.',
  'Early Penguin covers were colour-coded: orange for fiction, green for crime, dark blue for biography.',
  'Pippi Longstocking began as bedtime stories Astrid Lindgren told her daughter Karin, who was ill in bed.',
  'Miffy (Nijntje) was created by Dick Bruna in Utrecht in 1955.',
  'The word “novel” comes from the Italian novella, meaning something new.',
  'The word “library” comes from the Latin liber, which first meant the inner bark of a tree, an early writing material.',
  'Paper was invented in China; its invention is credited to Cai Lun, around the year 105.',
  'Without the First Folio of 1623, put together by Shakespeare’s fellow actors, 18 of his plays might have been lost.',
  'Don Quixote, whose first part came out in 1605, is often called the first modern novel.',
  'The Tale of Genji, written by Murasaki Shikibu over a thousand years ago, is often called the world’s first novel.',
  'Ian Fleming took the name James Bond from an American bird expert whose book he owned.',
  'Winnie-the-Pooh is named after Winnipeg, a real black bear at London Zoo that A. A. Milne’s son loved to visit.',
  'J. M. Barrie gave the rights to Peter Pan to Great Ormond Street children’s hospital in London.',
  'Agatha Christie is the most translated author in the world, ahead of Jules Verne and Shakespeare.',
  'Edgar Allan Poe’s The Murders in the Rue Morgue (1841) is often called the first modern detective story.',
  'Bram Stoker’s Dracula is told entirely through letters, diary entries and newspaper clippings.',
  'Charles Dickens published most of his novels in instalments, and readers waited eagerly for each new part.',
  'Mary Ann Evans wrote Middlemarch under the name George Eliot, so that her work would be taken seriously.',
  'The Nancy Drew books were written by a team of ghostwriters, all under the name Carolyn Keene.',
  'Lewis Carroll’s real name was Charles Lutwidge Dodgson.',
  'Anne Frank was given her diary for her thirteenth birthday.',
  'The Little Prince has been translated into hundreds of languages and dialects.',
  'The Gutenberg Bible, printed around 1455, was the first major book printed in Europe with movable metal type.',
  'Fewer than 50 copies of the Gutenberg Bible are known to survive.',
  'Jikji, a Korean Buddhist text printed in 1377, is the oldest surviving book printed with movable metal type.',
  'The Diamond Sutra, printed in China in 868, is the oldest printed book with a date in it.',
  'Bill Gates bought Leonardo da Vinci’s notebook, the Codex Leicester, in 1994 for about 30 million dollars.',
  'The Library of Congress in Washington holds more than 170 million items.',
  'Recorded “talking books” for blind readers were first made in the 1930s, the start of audiobooks.',
  'Roald Dahl made up hundreds of words, like “snozzcumber” and “whizzpopper” in The BFG.',
  'Many people credit Shakespeare with coining or popularising hundreds of English words and phrases.',
  'Parchment is made from animal skin; the finest kind, vellum, is made from calfskin.',
]

export interface DailyFact {
  fact: string
  /** today is a reading day already, so today's fact is in */
  today: boolean
}

/** Today's fact: one more for every day in the reading log up to today. */
export function dailyFact(books: Book[], now = new Date(), facts = FACTS): DailyFact {
  const todayKey = localDay(now)
  const days = new Set<string>()
  for (const b of books) for (const day of Object.keys(b.readingLog ?? {})) if (day <= todayKey) days.add(day)
  const n = days.size
  return { fact: facts[(Math.max(n, 1) - 1) % facts.length], today: days.has(todayKey) }
}

import type { Locale } from '@/types'

/**
 * UI copy. English is the source of truth for keys; every other locale must
 * provide exactly the same keys (enforced by the `Messages` type and by a
 * test that also checks each translation keeps the same `{placeholders}`).
 */
export const en = {
  'app.name': 'Token to Water',
  'app.tagline': 'AI water footprint visualizer',
  'app.skip': 'Skip to controls',

  'header.share': 'Share',
  'header.shareCopied': 'Link copied',
  'header.shareFailed': 'Could not copy the link',
  'header.settings': 'Settings',
  'header.theme': 'Theme: {theme}. Switch theme',
  'header.language': 'Language',

  'theme.system': 'System',
  'theme.light': 'Light',
  'theme.dark': 'Dark',

  'viz.region': 'Water visualization',
  'viz.tier': 'Tier {index} of {count}',
  'viz.fill': 'Fill level',
  'viz.alt': '{tier} filled to {percent}.',
  'viz.altPrevious': 'Next to it, for scale: a full {previous}.',
  'viz.fallback': 'Your browser cannot draw the illustration, but every number on this page is accurate.',
  'viz.scale': 'Scale',
  'viz.pause': 'Pause animation',
  'viz.play': 'Play animation',

  'readout.heading': 'Water footprint',
  'readout.basis': '{tokens} tokens × {rate} per token',
  'readout.current': 'Current container',
  'readout.fill': '{percent} {of}',
  'readout.beyond': 'More water than exists on Earth',

  'equivalence.empty': 'No water yet. Enter a number of tokens.',
  'equivalence.exact': 'Equivalent to {text}',
  'equivalence.approx': 'About {text}',
  'equivalence.pair': '{first} and {second}',
  'equivalence.fraction': '{value} {of}',
  'equivalence.times': '{count} × {name}',
  'equivalence.exactUnique': 'Exactly {name}',

  'stats.heading': 'In other words',
  'stats.volume': 'Volume',
  'stats.mass': 'Weight',
  'stats.drinking': 'Drinking water for one person',
  'stats.drinkingNote': 'at 2 L per day',
  'stats.drinkingBeyond': 'Longer than the age of the universe',

  'input.label': 'Tokens',
  'input.unit': 'tokens',
  'input.examples': 'e.g. 2.5k, 1.2M, 15T',
  'input.reading': 'Reads as {value} tokens',
  'input.readingOne': 'Reads as 1 token',
  'input.error.invalid': 'That doesn’t look like a number. Try 1500 or 2.5k.',
  'input.error.negative': 'Tokens can’t be negative. Enter 0 or more.',
  'input.error.too-large': 'That’s more than 10²⁵ tokens, the upper limit. Try a smaller number.',
  'input.error.empty': 'Enter a number of tokens.',
  'slider.label': 'Token count, logarithmic scale',
  'slider.value': '{value} tokens',

  'presets.label': 'Quick presets',
  'presets.short-query': 'Short query',
  'presets.extended-chat': 'Extended chat',
  'presets.book-summary': 'Book / PDF summary',
  'presets.frontier-training': 'Frontier model training',
  'presets.frontier-training.detail': 'Claude Opus 5 / Fable, ChatGPT 6 Astra scale',
  'presets.this-project': 'Building this app',
  'presets.this-project.detail': 'Every token Claude processed to create this very page',

  'ladder.heading': 'From a drop to the whole planet',
  'ladder.description': 'Twenty containers, each one much bigger than the last. Pick one to fill it exactly.',
  'ladder.jump': 'Fill {tier} ({volume})',
  'ladder.unreachable': '{tier} ({volume}) holds less than one token of water',
  'ladder.status.done': 'overflowing',
  'ladder.status.active': 'filling',

  'settings.title': 'Settings',
  'settings.description': 'Tune the estimate and how the visualizer looks and moves.',
  'settings.factor': 'Water per token',
  'settings.factorValue': '{value} per token',
  'settings.factorHelp':
    'Published estimates vary widely with the model, data centre, climate and season. The default, {value} per token, is a round reference that keeps the maths easy.',
  'settings.factorReset': 'Reset to {value}',
  'settings.quality': 'Rendering quality',
  'settings.quality.auto': 'Auto',
  'settings.quality.high': 'High',
  'settings.quality.low': 'Battery saver',
  'settings.qualityStatus.high': 'Using high quality: waves, splashes and glow.',
  'settings.qualityStatus.low': 'Using battery saver: simpler waves, no particles or blur.',
  'settings.qualityReason.fps': 'Switched automatically to keep the animation smooth.',
  'settings.qualityReason.hardware': 'Chosen for this device’s hardware.',
  'settings.qualityReason.save-data': 'Chosen because data saver is on.',
  'settings.motion': 'Reduce motion',
  'settings.motionHelp': 'Jump straight to each container and keep the water calm.',
  'settings.theme': 'Theme',
  'settings.language': 'Language',
  'settings.close': 'Close',

  'about.heading': 'How the numbers work',
  'about.p1':
    'Data centres use water to cool servers and, indirectly, to generate their electricity. This page turns a token count into litres at a fixed rate — 1 mL per token by default, so a 500-token prompt is one 500 mL bottle.',
  'about.p2':
    'Real figures depend on the model, the hardware, where and when it runs. Peer-reviewed estimates range from a fraction of a millilitre to tens of millilitres per response, so treat the result as an order of magnitude, not a meter reading. Adjust the rate in Settings.',
  'about.p3':
    'Each container fills from empty to full; when it overflows, the camera zooms out to the next one, which is drawn to scale by volume. Ocean and planet volumes come from USGS and NOAA.',
  'about.source': 'Read: “Making AI Less Thirsty” (Li et al., 2023)',

  'live.summary': '{tokens} tokens: {volume} of water. {equivalence}.',
  'share.text': '{tokens} AI tokens ≈ {volume} of water {icon} {equivalence}.',
  'footer.note': 'An illustrative estimate. Volumes are drawn to scale by volume, not by shape.',
} as const

export type MessageKey = keyof typeof en
export type Messages = Readonly<Record<MessageKey, string>>

export const ptBR: Messages = {
  'app.name': 'Token to Water',
  'app.tagline': 'Pegada hídrica da IA',
  'app.skip': 'Pular para os controles',

  'header.share': 'Compartilhar',
  'header.shareCopied': 'Link copiado',
  'header.shareFailed': 'Não foi possível copiar o link',
  'header.settings': 'Configurações',
  'header.theme': 'Tema: {theme}. Alternar tema',
  'header.language': 'Idioma',

  'theme.system': 'Sistema',
  'theme.light': 'Claro',
  'theme.dark': 'Escuro',

  'viz.region': 'Visualização da água',
  'viz.tier': 'Nível {index} de {count}',
  'viz.fill': 'Nível de água',
  'viz.alt': '{tier} com {percent} de água.',
  'viz.altPrevious': 'Ao lado, para comparação: {previous}, já transbordando.',
  'viz.fallback': 'Seu navegador não consegue desenhar a ilustração, mas todos os números desta página estão corretos.',
  'viz.scale': 'Escala',
  'viz.pause': 'Pausar animação',
  'viz.play': 'Reproduzir animação',

  'readout.heading': 'Pegada hídrica',
  'readout.basis': '{tokens} tokens × {rate} por token',
  'readout.current': 'Recipiente atual',
  'readout.fill': '{percent} {of}',
  'readout.beyond': 'Mais água do que existe na Terra',

  'equivalence.empty': 'Nenhuma água ainda. Digite um número de tokens.',
  'equivalence.exact': 'Equivale a {text}',
  'equivalence.approx': 'Cerca de {text}',
  'equivalence.pair': '{first} e {second}',
  'equivalence.fraction': '{value} {of}',
  'equivalence.times': '{count} × {name}',
  'equivalence.exactUnique': 'Exatamente {name}',

  'stats.heading': 'Em outras palavras',
  'stats.volume': 'Volume',
  'stats.mass': 'Peso',
  'stats.drinking': 'Água para uma pessoa beber',
  'stats.drinkingNote': 'a 2 L por dia',
  'stats.drinkingBeyond': 'Mais tempo do que a idade do universo',

  'input.label': 'Tokens',
  'input.unit': 'tokens',
  'input.examples': 'ex.: 2,5 mil, 1,2 mi, 15 tri',
  'input.reading': 'Lido como {value} tokens',
  'input.readingOne': 'Lido como 1 token',
  'input.error.invalid': 'Isso não parece um número. Tente 1500 ou 2,5 mil.',
  'input.error.negative': 'Tokens não podem ser negativos. Digite 0 ou mais.',
  'input.error.too-large': 'Isso passa de 10²⁵ tokens, o limite máximo. Tente um número menor.',
  'input.error.empty': 'Digite um número de tokens.',
  'slider.label': 'Quantidade de tokens, escala logarítmica',
  'slider.value': '{value} tokens',

  'presets.label': 'Atalhos',
  'presets.short-query': 'Pergunta curta',
  'presets.extended-chat': 'Conversa longa',
  'presets.book-summary': 'Resumo de livro / PDF',
  'presets.frontier-training': 'Treino de modelo de fronteira',
  'presets.frontier-training.detail': 'Escala Claude Opus 5 / Fable, ChatGPT 6 Astra',
  'presets.this-project': 'Criar este app',
  'presets.this-project.detail': 'Todos os tokens que o Claude processou para criar esta página',

  'ladder.heading': 'De uma gota ao planeta inteiro',
  'ladder.description': 'Vinte recipientes, cada um bem maior que o anterior. Escolha um para enchê-lo exatamente.',
  'ladder.jump': 'Encher {tier} ({volume})',
  'ladder.unreachable': '{tier} ({volume}) comporta menos que um token de água',
  'ladder.status.done': 'transbordando',
  'ladder.status.active': 'enchendo',

  'settings.title': 'Configurações',
  'settings.description': 'Ajuste a estimativa e a aparência e o movimento da visualização.',
  'settings.factor': 'Água por token',
  'settings.factorValue': '{value} por token',
  'settings.factorHelp':
    'As estimativas publicadas variam muito conforme o modelo, o data center, o clima e a estação. O padrão, {value} por token, é uma referência redonda que facilita as contas.',
  'settings.factorReset': 'Voltar para {value}',
  'settings.quality': 'Qualidade de renderização',
  'settings.quality.auto': 'Automática',
  'settings.quality.high': 'Alta',
  'settings.quality.low': 'Economia de bateria',
  'settings.qualityStatus.high': 'Usando qualidade alta: ondas, respingos e brilho.',
  'settings.qualityStatus.low': 'Usando economia de bateria: ondas simples, sem partículas nem desfoque.',
  'settings.qualityReason.fps': 'Ativada automaticamente para manter a animação fluida.',
  'settings.qualityReason.hardware': 'Escolhida pelo hardware deste aparelho.',
  'settings.qualityReason.save-data': 'Escolhida porque a economia de dados está ativa.',
  'settings.motion': 'Reduzir movimento',
  'settings.motionHelp': 'Vai direto para cada recipiente e deixa a água calma.',
  'settings.theme': 'Tema',
  'settings.language': 'Idioma',
  'settings.close': 'Fechar',

  'about.heading': 'Como os números funcionam',
  'about.p1':
    'Data centers usam água para resfriar servidores e, indiretamente, para gerar a eletricidade que consomem. Esta página converte tokens em litros a uma taxa fixa — 1 mL por token por padrão, então um prompt de 500 tokens equivale a uma garrafinha de 500 mL.',
  'about.p2':
    'Os números reais dependem do modelo, do hardware, de onde e quando ele roda. Estimativas revisadas por pares vão de uma fração de mililitro a dezenas de mililitros por resposta, então trate o resultado como ordem de grandeza, não como leitura de hidrômetro. Ajuste a taxa nas Configurações.',
  'about.p3':
    'Cada recipiente enche do vazio ao cheio; quando transborda, a câmera se afasta até o próximo, desenhado em escala pelo volume. Os volumes de oceanos e do planeta vêm do USGS e da NOAA.',
  'about.source': 'Leia: “Making AI Less Thirsty” (Li et al., 2023)',

  'live.summary': '{tokens} tokens: {volume} de água. {equivalence}.',
  'share.text': '{tokens} tokens de IA ≈ {volume} de água {icon} {equivalence}.',
  'footer.note': 'Uma estimativa ilustrativa. Os recipientes estão em escala pelo volume, não pelo formato.',
}

export const MESSAGES: Readonly<Record<Locale, Messages>> = { en, 'pt-BR': ptBR }

export const LOCALES: readonly Locale[] = ['en', 'pt-BR']

/** Pick the best supported locale from the browser's preference list. */
export function detectLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const lower = language.toLowerCase()
    if (lower.startsWith('pt')) return 'pt-BR'
    if (lower.startsWith('en')) return 'en'
  }
  return 'en'
}

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'pt-BR'
}

/** Replace `{name}` placeholders. Unknown placeholders are left visible so missing data is obvious, not silent. */
export function interpolate(template: string, values: Readonly<Record<string, string | number>> = {}): string {
  return template.replace(/\{(\w[\w-]*)\}/g, (match, key: string) => {
    const value = values[key]
    return value === undefined ? match : String(value)
  })
}

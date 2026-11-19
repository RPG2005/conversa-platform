<script setup>
defineProps({ title: { type: String, required: true }, detail: { type: String, default: '' } })
</script>

<template>
  <section
    class="state"
    role="status"
  >
    <h2>{{ title }}</h2>
    <p v-if="detail">
      {{ detail }}
    </p>
  </section>
</template>

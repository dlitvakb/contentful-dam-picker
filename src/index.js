import { AssetCard, Grid, TextInput, Button, IconButton, Paragraph, Stack, Note, FormControl, Select, Pagination } from '@contentful/f36-components'
import { SearchIcon } from '@contentful/f36-icons'
import { setup } from '@contentful/dam-app-base'
import React, { useState, useEffect } from 'react'
import { render } from 'react-dom'

function ExternalAssetCard({ asset, onClick, selectedAssets }) {
  return (
    <AssetCard
      key={asset.sys.id}
      status="published"
      type="image"
      title={asset.fields.title}
      src={`${asset.fields.file.url}?h=150&q=50&fm=avif`}
      onClick={() => onClick(asset)}
      size="small"
      isSelected={!!selectedAssets.find((a) => a.sys.id === asset.sys.id)}
   />
  )
}

function ExternalAssetCardList({ assets, onClick, selectedAssets }) {
  return (
    <Grid style={{ width: '100%' }} rowGap="spacingXs" columns={4}>
      {assets.filter(asset => !!asset.fields.file.url).map((asset) => {
        return <ExternalAssetCard key={asset.sys.id} asset={asset} onClick={onClick} selectedAssets={selectedAssets} />
      })}
    </Grid>
  )
}

function LoadingAssetList() {
  return (
    <Grid style={{ width: '100%' }} columns={4}>
      <AssetCard
        status="published"
        type="image"
        size="small"
        isLoading
      />
      <AssetCard
        status="published"
        type="image"
        size="small"
        isLoading
      />
      <AssetCard
        status="published"
        type="image"
        size="small"
        isLoading
      />
      <AssetCard
        status="published"
        type="image"
        size="small"
        isLoading
      />
    </Grid>
  )
}

function ExternalAssetCardDialog({ sdk }) {
  const spaceId = sdk.parameters.invocation.config.spaceId
  const deliveryApiToken = sdk.parameters.invocation.config.deliveryApiToken
  const defaultLocale = sdk.parameters.invocation.config.defaultLocale

  const [availableLocales, setAvailableLocales] = useState([])
  const [selectedLocale, setSelectedLocale] = useState(defaultLocale)
  const [availableAssets, setAvailableAssets] = useState([])
  const [filteredAssets, setFilteredAssets] = useState(availableAssets)
  const [selectedAssets, setSelectedAssets] = useState([])

  const [filteredPageAssets, setFilteredPageAssets] = useState(availableAssets)

  const [page, setPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const onClickSelect = (asset) => {
    let newSelectedAssets

    if (selectedAssets.find((a) => a.sys.id === asset.sys.id)) {
      newSelectedAssets = selectedAssets.filter((a) => a.sys.id !== asset.sys.id)
    } else {
      newSelectedAssets = [...selectedAssets, asset]
    }

    setSelectedAssets(newSelectedAssets)
  }

  const handleFilterValueChange = (e) => {
    const newFilteredAssets = availableAssets.filter((asset) =>
      asset.fields.title.toLowerCase().includes(e.target.value.toLowerCase()),
    )
    setFilteredAssets(newFilteredAssets)
    changeFilteredPage(0)
  }

  const changeSelectedLocale = (e) => {
    setSelectedLocale(e.target.value)
  }

  const handleViewPerPageChange = (i) => {
    setItemsPerPage(i);
    changeFilteredPage(0, i);
  };

  const changeFilteredPage = (p, perPage) => {
    setPage(p)

    perPage = (perPage !== undefined && itemsPerPage !== perPage) ? perPage : itemsPerPage
    setFilteredPageAssets(filteredAssets.slice(perPage * p, perPage * (p + 1)))
  }

  useEffect(() => {
    async function fetchTotalAssets() {
      const response = await fetch(`https://cdn.contentful.com/spaces/${spaceId}/environments/master/assets?limit=1`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${deliveryApiToken}`
        },
      })

      return (await response.json()).total
    }

    async function fetchAssetsPage(page) {
      const response = await fetch(`https://cdn.contentful.com/spaces/${spaceId}/environments/master/assets?&limit=1000&skip=${1000 * page}&locale=${selectedLocale}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${deliveryApiToken}`
        },
      })

      return (await response.json()).items
    }

    async function fetchAssets() {
      const totalAssets = await fetchTotalAssets()
      let assets = []
      for (let page = 0; page < totalAssets / 1000; page++) {
        assets = assets.concat(await fetchAssetsPage(page))
      }

      setAvailableAssets(assets)
      setFilteredAssets(assets)
      setFilteredPageAssets(assets.slice(0, itemsPerPage))
    }

    async function fetchLocales() {
      const response = await fetch(`https://cdn.contentful.com/spaces/${spaceId}/environments/master/locales`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${deliveryApiToken}`
        },
      })

      const locales = await response.json()

      setAvailableLocales(locales.items.map((l) => { return {code: l.code, name: l.name}}))
    }

    if (availableLocales.length === 0) {
      fetchLocales()
    } else {
      fetchAssets()
    }
  }, [availableLocales, selectedLocale])

  return (
    <Stack flexDirection="column" padding="spacingM" alignItems="flex-start">
      <Note variant="neutral" style={{width: '95.5%'}}>
        Assets selected will be appended to the current asset selection.
      </Note>
      {availableLocales.length === 0 && <>
        <Paragraph>Loading locales...</Paragraph>
      </>}
      {availableLocales.length >= 0 && availableAssets.length === 0 ?
        (<>
          <LoadingAssetList />
        </>) :
        (<>
          <Stack fullWidth flexDirection="column">
            <FormControl>
              <FormControl.Label>Select locale</FormControl.Label>
              <Select id="localeSelect" name="localeSelect" value={selectedLocale} onChange={changeSelectedLocale}>
                {availableLocales.map((locale) => {
                  return <Select.Option key={locale.code} value={locale.code}>{locale.name}</Select.Option>
                })}
              </Select>
            </FormControl>
            <TextInput.Group>
              <IconButton
                variant="secondary"
                icon={<SearchIcon />}
                aria-label="Search"
                isDisabled
              />
              <TextInput
                aria-label="Search filter"
                id="search-filter"
                defaultValue=""
                onChange={handleFilterValueChange}
                placeholder="Search by asset title..."
              />
            </TextInput.Group>
          </Stack>

          <Stack fullWidth flexDirection="column" alignItems="flex-end">
            <Pagination
              activePage={page}
              onPageChange={changeFilteredPage}
              isLastPage={page === Math.floor(filteredAssets.length / itemsPerPage)}
              totalItems={filteredAssets.length}
              showViewPerPage
              viewPerPageOptions={[20, 60, 100]}
              itemsPerPage={itemsPerPage}
              onViewPerPageChange={handleViewPerPageChange}
              pageLength={filteredPageAssets.length}
            />
          </Stack>

          {filteredAssets.length === 0 ?
          (<>
            <Stack fullWidth alignItems="center">
              <Paragraph>No assets match the current search...</Paragraph>
            </Stack>
          </>) : <ExternalAssetCardList assets={filteredPageAssets} onClick={onClickSelect} selectedAssets={selectedAssets} />}

          <Stack fullWidth flexDirection="column" alignItems="flex-end">
            <Pagination
              activePage={page}
              onPageChange={changeFilteredPage}
              isLastPage={page === Math.floor(filteredAssets.length / itemsPerPage)}
              totalItems={filteredAssets.length}
              showViewPerPage
              viewPerPageOptions={[20, 60, 100]}
              itemsPerPage={itemsPerPage}
              onViewPerPageChange={handleViewPerPageChange}
              pageLength={filteredPageAssets.length}
            />
            <Button
                variant="primary"
                isDisabled={!availableAssets}
                onClick={() => sdk.close(selectedAssets || [])}>
              Save
            </Button>
          </Stack>
        </>)
      }
    </Stack>
  )
}

setup({
  cta: 'Select asset',
  name: 'Contentful DAM',
  logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Picture_icon_BLACK.svg/1200px-Picture_icon_BLACK.svg.png',
  color: '#d7f0fa',
  description: 'Contentful as DAM',
  parameterDefinitions: [
    {
      "id": "spaceId",
      "type": "Symbol",
      "name": "Space ID",
      "description": "Target Space ID",
      "required": true
    },
    {
      "id": "deliveryApiToken",
      "type": "Symbol",
      "name": "Delivery API Token",
      "description": "Delivery API Token of target space",
      "required": true
    },
    {
      "id": "defaultLocale",
      "type": "Symbol",
      "name": "Default Locale",
      "description": "Default locale of target space",
      "required": true
    }
  ],
  validateParameters: () => true,
  makeThumbnail: asset => [`${asset.fields.file.url}?h=100&q=50&fm=avif`, asset.fields.title],
  renderDialog: async (sdk) => {
    render(<ExternalAssetCardDialog sdk={sdk} />, document.getElementById('root'))
    sdk.window.startAutoResizer()
  },
  openDialog: async (sdk, currentValue, config) => {
    config["spaceId"] = sdk.parameters.instance.spaceId
    config["deliveryApiToken"] = sdk.parameters.instance.deliveryApiToken
    config["defaultLocale"] = sdk.parameters.instance.defaultLocale

    const result = await sdk.dialogs.openCurrentApp({
      parameters: { config, currentValue },
      position: 'center',
      title: 'Select an asset',
      shouldCloseOnOverlayClick: true,
      shouldCloseOnEscapePress: true,
      width: 800,
      minHeight: 600,
      allowHeightOverflow: true,
    })

    if (!Array.isArray(result)) {
      return []
    }

    return result
  },
  isDisabled: () => false
})
